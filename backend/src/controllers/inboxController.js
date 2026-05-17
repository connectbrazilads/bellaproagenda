const prisma = require('../lib/prisma');
const { enviarMensagem } = require('../services/whatsappService');
const inboxEvents = require('../lib/events');

async function getScopedConversa(salaoId, id) {
  return prisma.conversa.findFirst({
    where: {
      id,
      salaoId,
    },
  });
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

  res.json(
    conversas.map((conversa) => ({
      id: conversa.id,
      telefone: conversa.telefone,
      nomeCliente: conversa.nomeCliente,
      atendimento: conversa.atendimento,
      status: conversa.status,
      updatedAt: conversa.updatedAt,
      ultimaMensagem: conversa.mensagens[0] || null,
    }))
  );
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
  streamEvents,
  getRespostasRapidas,
  createRespostaRapida,
  deleteRespostaRapida,
};
