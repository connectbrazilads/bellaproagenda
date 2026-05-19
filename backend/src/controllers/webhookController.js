const prisma = require('../lib/prisma');
const { processarMensagem } = require('../services/whatsappAgentService');
const { enviarMensagem } = require('../services/whatsappService');
const { fetchEvolutionProfilePictureUrl } = require('../services/evolutionService');
const inboxEvents = require('../lib/events');

function normalizeEvolutionEvent(value = '') {
  return String(value || '')
    .trim()
    .replace(/\./g, '_')
    .replace(/-/g, '_')
    .toUpperCase();
}

function extractIncomingText(data) {
  return (
    data?.message?.conversation ||
    data?.message?.extendedTextMessage?.text ||
    data?.message?.imageMessage?.caption ||
    data?.message?.videoMessage?.caption ||
    data?.body ||
    data?.text ||
    ''
  );
}

function extractMediaPayload(data) {
  const message = data?.message || {};

  const matchers = [
    { key: 'imageMessage', tipo: 'imagem' },
    { key: 'audioMessage', tipo: 'audio' },
    { key: 'documentMessage', tipo: 'anexo' },
    { key: 'videoMessage', tipo: 'video' },
  ];

  for (const matcher of matchers) {
    const node = message?.[matcher.key];
    if (!node) continue;

    const mediaBase64Raw =
      node?.base64
      || node?.fileBase64
      || data?.base64
      || data?.media?.base64
      || message?.base64
      || '';

    const mediaBase64 = String(mediaBase64Raw || '')
      .replace(/^data:[^;]+;base64,/, '')
      .trim();

    return {
      tipo: matcher.tipo,
      mimeType: node?.mimetype || node?.mimeType || null,
      mediaUrl: node?.url || node?.directPath || node?.mediaUrl || null,
      mediaBase64: mediaBase64 || null,
      nomeArquivo: node?.fileName || node?.filename || null,
      duracaoSeg: Number(node?.seconds || node?.duration || 0) || null,
      legenda:
        node?.caption
        || node?.fileName
        || node?.filename
        || '',
    };
  }

  return null;
}

function buildMensagemConteudo(texto, media) {
  const cleanedText = String(texto || '').trim();
  if (cleanedText) return cleanedText;
  if (!media) return '';

  if (media.tipo === 'imagem') return media.legenda ? `Imagem: ${media.legenda}` : 'Imagem recebida';
  if (media.tipo === 'audio') return media.legenda ? `Audio: ${media.legenda}` : 'Audio recebido';
  if (media.tipo === 'anexo') return media.nomeArquivo ? `Anexo: ${media.nomeArquivo}` : 'Anexo recebido';
  if (media.tipo === 'video') return media.legenda ? `Video: ${media.legenda}` : 'Video recebido';
  return media.legenda || 'Midia recebida';
}

function uniqueNonEmpty(values) {
  return [...new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )];
}

function normalizePhoneDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}

function extractContactName(data = {}) {
  return String(
    data?.pushName
    || data?.pushname
    || data?.notifyName
    || data?.senderName
    || data?.verifiedBizName
    || ''
  ).trim();
}

function buildPhoneVariants(values) {
  const variants = new Set();

  for (const value of values) {
    const digits = normalizePhoneDigits(value);
    if (!digits) continue;

    variants.add(digits);
    if (digits.startsWith('55') && digits.length > 11) {
      variants.add(digits.slice(2));
    }
  }

  return [...variants];
}

async function findNomeCliente(salaoId, telefone, data) {
  const nomeContato = extractContactName(data);
  if (nomeContato) return nomeContato;

  const phoneCandidates = buildPhoneVariants([telefone]);
  if (phoneCandidates.length) {
    const cliente = await prisma.cliente.findFirst({
      where: {
        salaoId,
        OR: phoneCandidates.map((candidate) => ({
          telefone: { contains: candidate },
        })),
      },
      select: { nome: true },
    });

    if (cliente?.nome) return cliente.nome;
  }

  const agendamento = await prisma.agendamento.findFirst({
    where: { salaoId, clienteTelefone: { endsWith: telefone.slice(-9) } },
    orderBy: { createdAt: 'desc' },
    select: { clienteNome: true },
  });

  return agendamento?.clienteNome || null;
}

function extractSalaoLookupCandidates(body, data) {
  const rawCandidates = uniqueNonEmpty([
    body?.instance,
    body?.instanceName,
    body?.sender,
    body?.owner,
    body?.numberId,
    data?.instance,
    data?.instanceName,
    data?.sender,
    data?.owner,
    data?.numberId,
  ]).flatMap((value) => {
    const withoutJid = value.replace(/@s\.whatsapp\.net$/i, '');
    return withoutJid && withoutJid !== value ? [value, withoutJid] : [value];
  });

  return {
    rawCandidates: uniqueNonEmpty(rawCandidates),
    phoneCandidates: buildPhoneVariants(rawCandidates),
  };
}

async function findSalaoByWebhookPayload(body, data) {
  const { rawCandidates, phoneCandidates } = extractSalaoLookupCandidates(body, data);

  if (!rawCandidates.length && !phoneCandidates.length) {
    return { salao: null, rawCandidates: [], phoneCandidates: [] };
  }

  const or = [
    ...rawCandidates.flatMap((candidate) => ([
      { evolutionInstance: candidate },
      { slug: candidate },
    ])),
    ...phoneCandidates.flatMap((candidate) => ([
      { whatsapp: { contains: candidate } },
      { whatsappAgendamentos: { contains: candidate } },
      { telefone: { contains: candidate } },
    ])),
  ];

  const salao = await prisma.salao.findFirst({ where: { OR: or } });
  return { salao, rawCandidates, phoneCandidates };
}

async function handleWhatsapp(req, res) {
  res.sendStatus(200);

  try {
    const body = req.body;
    const event = normalizeEvolutionEvent(body?.event);
    if (event !== 'MESSAGES_UPSERT') return;

    const data = body?.data || body;
    if (!data?.key) return;
    if (data.key.fromMe) return;

    const jid = data.key.remoteJid || '';
    if (!jid || jid.includes('@g.us')) return;

    const telefone = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!telefone) return;

    const texto = extractIncomingText(data);
    const media = extractMediaPayload(data);
    const conteudoMensagem = buildMensagemConteudo(texto, media);
    if (!conteudoMensagem) return;

    const { salao, rawCandidates, phoneCandidates } = await findSalaoByWebhookPayload(body, data);
    if (!salao) {
      console.warn('[Webhook WhatsApp] Salao nao encontrado para payload', {
        event: body?.event,
        rawCandidates,
        phoneCandidates,
      });
      return;
    }

    const salaoId = salao.id;

    // Find or create conversation (unique per salão + telefone)
    let conversa = await prisma.conversa.findUnique({ where: { salaoId_telefone: { salaoId, telefone } } });

    if (!conversa) {
      const nomeCliente = await findNomeCliente(salaoId, telefone, data);
      let avatarUrl = null;

      try {
        avatarUrl = await fetchEvolutionProfilePictureUrl(salao, telefone);
      } catch {
        avatarUrl = null;
      }

      conversa = await prisma.conversa.create({
        data: {
          salaoId,
          telefone,
          nomeCliente,
          avatarUrl,
        },
      });
    } else {
      const dataAtualizacao = {
        updatedAt: new Date(),
        status: 'aberta',
      };

      if (!conversa.nomeCliente) {
        const nomeCliente = await findNomeCliente(salaoId, telefone, data);
        if (nomeCliente) dataAtualizacao.nomeCliente = nomeCliente;
      }

      if (!conversa.avatarUrl) {
        try {
          const avatarUrl = await fetchEvolutionProfilePictureUrl(salao, telefone);
          if (avatarUrl) dataAtualizacao.avatarUrl = avatarUrl;
        } catch {
          // segue sem avatar se a Evolution nao retornar imagem
        }
      }

      await prisma.conversa.update({
        where: { id: conversa.id },
        data: dataAtualizacao,
      });
    }

    // Save incoming message
    const novaMensagemEntrada = await prisma.mensagem.create({
      data: {
        conversaId: conversa.id,
        conteudo: conteudoMensagem,
        direcao: 'entrada',
        origem: 'cliente',
        tipo: media?.tipo || 'texto',
        mimeType: media?.mimeType || null,
        mediaUrl: media?.mediaUrl || null,
        mediaBase64: media?.mediaBase64 || null,
        nomeArquivo: media?.nomeArquivo || null,
        duracaoSeg: media?.duracaoSeg || null,
      },
    });

    inboxEvents.emit('nova_mensagem', { salaoId, conversaId: conversa.id, mensagem: novaMensagemEntrada });

    // Skip AI if a human is handling
    if (conversa.atendimento !== 'ia') return;

    const resposta = await processarMensagem(salaoId, telefone, conteudoMensagem);
    if (!resposta) return;

    await enviarMensagem(telefone, resposta, salao);

    const novaMensagemSaida = await prisma.mensagem.create({
      data: {
        conversaId: conversa.id,
        conteudo: resposta,
        direcao: 'saida',
        origem: 'ia',
      },
    });

    await prisma.conversa.update({
      where: { id: conversa.id },
      data: { updatedAt: new Date() },
    });

    inboxEvents.emit('nova_mensagem', { salaoId, conversaId: conversa.id, mensagem: novaMensagemSaida });
  } catch (err) {
    console.error('[Webhook WhatsApp]', err.message);
  }
}

module.exports = { handleWhatsapp };
