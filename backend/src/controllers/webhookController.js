const prisma = require('../lib/prisma');
const { processarMensagem } = require('../services/whatsappAgentService');
const { enviarMensagem } = require('../services/whatsappService');
const inboxEvents = require('../lib/events');

async function handleWhatsapp(req, res) {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.event !== 'messages.upsert') return;

    const data = body.data;
    if (!data?.key) return;
    if (data.key.fromMe) return;

    const jid = data.key.remoteJid || '';
    if (!jid || jid.includes('@g.us')) return;

    const telefone = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (!telefone) return;

    const texto =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption;

    if (!texto || typeof texto !== 'string') return;

    // Identify the salão by the Evolution API instance (slug) that sent the webhook
    const salao = await prisma.salao.findFirst({ where: { slug: body.instance } });
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
        conteudo: texto.trim(),
        direcao: 'entrada',
        origem: 'cliente',
      },
    });

    inboxEvents.emit('nova_mensagem', { salaoId, conversaId: conversa.id, mensagem: novaMensagemEntrada });

    // Skip AI if a human is handling
    if (conversa.atendimento !== 'ia') return;

    const resposta = await processarMensagem(salaoId, telefone, texto.trim());
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
