const prisma = require('../lib/prisma');
const { enviarMensagem } = require('../services/whatsappService');
const {
  sendEvolutionAudio,
  sendEvolutionMedia,
} = require('../services/evolutionService');
const inboxEvents = require('../lib/events');

async function getScopedConversa(salaoId, id) {
  return prisma.conversa.findFirst({
    where: {
      id,
      salaoId,
    },
  });
}

function inferOutgoingMediaType(mimeType = '', nomeArquivo = '') {
  const mime = String(mimeType || '').toLowerCase();
  const fileName = String(nomeArquivo || '').toLowerCase();

  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|opus|m4a|aac|webm)$/i.test(fileName)) {
    return { tipoMensagem: 'audio', tipoEvolution: 'audio' };
  }

  if (mime.startsWith('image/')) {
    return { tipoMensagem: 'imagem', tipoEvolution: 'image' };
  }

  if (mime.startsWith('video/')) {
    return { tipoMensagem: 'video', tipoEvolution: 'video' };
  }

  return { tipoMensagem: 'anexo', tipoEvolution: 'document' };
}

function buildOutgoingMediaLabel(tipoMensagem, legenda, nomeArquivo) {
  const texto = String(legenda || '').trim();
  if (texto) return texto;

  if (tipoMensagem === 'imagem') return nomeArquivo ? `Imagem: ${nomeArquivo}` : 'Imagem enviada';
  if (tipoMensagem === 'audio') return nomeArquivo ? `Audio: ${nomeArquivo}` : 'Audio enviado';
  if (tipoMensagem === 'video') return nomeArquivo ? `Video: ${nomeArquivo}` : 'Video enviado';
  return nomeArquivo ? `Anexo: ${nomeArquivo}` : 'Arquivo enviado';
}

async function getConversas(req, res) {
  const { status, atendimento } = req.query;
  const where = {
    salaoId: req.user.salaoId,
  };

  if (status) where.status = status;
  if (atendimento) where.atendimento = atendimento;

  const conversas = await prisma.conversa.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      mensagens: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const payload = conversas.map((conversa) => ({
      id: conversa.id,
      telefone: conversa.telefone,
      nomeCliente: conversa.nomeCliente,
      avatarUrl: conversa.avatarUrl || null,
      atendimento: conversa.atendimento,
      status: conversa.status,
      updatedAt: conversa.updatedAt,
      ultimaMensagem: conversa.mensagens[0] || null,
    }));

  res.json(payload);
}

async function getMensagens(req, res) {
  const { id } = req.params;
  const conversa = await getScopedConversa(req.user.salaoId, id);
  if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });

  const mensagens = await prisma.mensagem.findMany({
    where: { conversaId: id },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  res.json(mensagens);
}

async function atualizarConversa(req, res) {
  const { id } = req.params;
  const { atendimento, status } = req.body;
  const conversaAtual = await getScopedConversa(req.user.salaoId, id);
  if (!conversaAtual) return res.status(404).json({ error: 'Conversa nao encontrada' });

  const data = {};
  if (atendimento !== undefined) data.atendimento = atendimento;
  if (status !== undefined) data.status = status;

  const conversa = await prisma.conversa.update({
    where: { id },
    data,
  });

  inboxEvents.emit('conversa_atualizada', { salaoId: req.user.salaoId, conversaId: id });

  res.json(conversa);
}

async function responderConversa(req, res) {
  const { id } = req.params;
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ error: 'Texto obrigatorio' });

  const conversa = await getScopedConversa(req.user.salaoId, id);
  if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });

  const salao = await prisma.salao.findUnique({
    where: { id: req.user.salaoId },
    select: {
      slug: true,
      moduloWhatsapp: true,
      moduloIA: true,
      nome: true,
    },
  });

  if (!salao?.moduloWhatsapp) return res.status(403).json({ error: 'Módulo WhatsApp inativo' });

  const novaMensagem = await prisma.mensagem.create({
    data: {
      conversaId: id,
      conteudo: texto,
      direcao: 'saida',
      origem: 'admin',
    },
  });

  await prisma.conversa.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  inboxEvents.emit('nova_mensagem', { salaoId: req.user.salaoId, conversaId: id, mensagem: novaMensagem });

  await enviarMensagem(conversa.telefone, texto, salao);

  res.json({ ok: true });
}

async function responderConversaMidia(req, res) {
  const { id } = req.params;
  const { mediaUrl, mimeType, nomeArquivo, legenda } = req.body || {};

  if (!String(mediaUrl || '').trim()) {
    return res.status(400).json({ error: 'Arquivo obrigatorio' });
  }

  const conversa = await getScopedConversa(req.user.salaoId, id);
  if (!conversa) return res.status(404).json({ error: 'Conversa nao encontrada' });

  const salao = await prisma.salao.findUnique({
    where: { id: req.user.salaoId },
    select: {
      slug: true,
      moduloWhatsapp: true,
      moduloIA: true,
      nome: true,
      evolutionUrl: true,
      evolutionKey: true,
      evolutionInstance: true,
    },
  });

  if (!salao?.moduloWhatsapp) return res.status(403).json({ error: 'Modulo WhatsApp inativo' });

  const { tipoMensagem, tipoEvolution } = inferOutgoingMediaType(mimeType, nomeArquivo);
  const conteudo = buildOutgoingMediaLabel(tipoMensagem, legenda, nomeArquivo);

  if (tipoEvolution === 'audio') {
    await sendEvolutionAudio(salao, conversa.telefone, {
      audio: mediaUrl,
      mimetype: mimeType || 'audio/webm',
      fileName: nomeArquivo || 'audio.webm',
    });
  } else {
    await sendEvolutionMedia(salao, conversa.telefone, {
      media: mediaUrl,
      mediatype: tipoEvolution,
      mimetype: mimeType || 'application/octet-stream',
      caption: legenda || nomeArquivo || 'Arquivo enviado',
      fileName: nomeArquivo || 'arquivo',
    });
  }

  const novaMensagem = await prisma.mensagem.create({
    data: {
      conversaId: id,
      conteudo,
      direcao: 'saida',
      origem: 'admin',
      tipo: tipoMensagem,
      mimeType: mimeType || null,
      mediaUrl: mediaUrl || null,
      nomeArquivo: nomeArquivo || null,
    },
  });

  await prisma.conversa.update({
    where: { id },
    data: {
      updatedAt: new Date(),
      status: 'aberta',
    },
  });

  inboxEvents.emit('nova_mensagem', { salaoId: req.user.salaoId, conversaId: id, mensagem: novaMensagem });

  res.json({ ok: true, mensagem: novaMensagem });
}

async function streamEvents(req, res) {
  const salaoId = req.user.salaoId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  const onUpdate = (data) => {
    if (data.salaoId === salaoId) {
      res.write(`data: ${JSON.stringify({ type: 'update' })}\n\n`);
    }
  };

  inboxEvents.on('nova_mensagem', onUpdate);
  inboxEvents.on('conversa_atualizada', onUpdate);

  req.on('close', () => {
    clearInterval(pingInterval);
    inboxEvents.off('nova_mensagem', onUpdate);
    inboxEvents.off('conversa_atualizada', onUpdate);
  });
}

async function getRespostasRapidas(req, res) {
  const respostas = await prisma.respostaRapida.findMany({
    where: { salaoId: req.user.salaoId },
    orderBy: { atalho: 'asc' },
  });
  res.json(respostas);
}

async function createRespostaRapida(req, res) {
  const { atalho, texto } = req.body;
  const cleanedAtalho = atalho.startsWith('/') ? atalho.substring(1) : atalho;
  
  if (!cleanedAtalho || !texto) return res.status(400).json({ error: 'Atalho e texto sao obrigatorios' });

  const resposta = await prisma.respostaRapida.create({
    data: {
      salaoId: req.user.salaoId,
      atalho: cleanedAtalho,
      texto,
    },
  });
  res.json(resposta);
}

async function deleteRespostaRapida(req, res) {
  const { id } = req.params;
  await prisma.respostaRapida.deleteMany({
    where: {
      id,
      salaoId: req.user.salaoId,
    },
  });
  res.json({ ok: true });
}

module.exports = {
  getConversas,
  getMensagens,
  atualizarConversa,
  responderConversa,
  responderConversaMidia,
  streamEvents,
  getRespostasRapidas,
  createRespostaRapida,
  deleteRespostaRapida,
};
