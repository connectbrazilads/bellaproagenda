const prisma = require('../lib/prisma');
const { processarMensagem } = require('../services/whatsappAgentService');
const { enviarMensagem } = require('../services/whatsappService');
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

    // Identify the salão by the Evolution API instance (slug) that sent the webhook
    const instanceName = String(body?.instance || body?.instanceName || body?.sender || '').trim();
    if (!instanceName) return;

    const salao = await prisma.salao.findFirst({
      where: {
        OR: [
          { evolutionInstance: instanceName },
          { slug: instanceName },
        ],
      },
    });
    if (!salao) return;

    const salaoId = salao.id;

    // Find or create conversation (unique per salão + telefone)
    let conversa = await prisma.conversa.findUnique({ where: { salaoId_telefone: { salaoId, telefone } } });

    if (!conversa) {
      const agendamento = await prisma.agendamento.findFirst({
        where: { salaoId, clienteTelefone: { endsWith: telefone.slice(-9) } },
        orderBy: { createdAt: 'desc' },
        select: { clienteNome: true },
      });

      conversa = await prisma.conversa.create({
        data: {
          salaoId,
          telefone,
          nomeCliente: agendamento?.clienteNome || null,
        },
      });
    } else {
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: { updatedAt: new Date() },
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
