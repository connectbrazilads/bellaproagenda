const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { getEvolutionStatus } = require('./evolutionService');
const { criarNotificacaoSalao } = require('./notificationCenterService');

// We'll use this memory map to avoid spamming alerts every 15 mins.
// We only alert again after 4 hours of being disconnected.
const lastAlerted = new Map();
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; 

async function notificarQuedaWhatsapp(salao) {
  const agora = Date.now();
  const ultimo = lastAlerted.get(salao.id) || 0;

  if (agora - ultimo < ALERT_COOLDOWN_MS) {
    return; // Already alerted recently
  }

  // 1. Criar notificação no painel
  await criarNotificacaoSalao({
    salaoId: salao.id,
    tipo: 'alert',
    titulo: 'Conexão do WhatsApp caiu',
    mensagem: 'A conexão com a Evolution API foi perdida. Acesse a tela de WhatsApp para escanear o QR Code novamente.',
  });

  // 2. Enviar email para o admin do salão
  const admins = await prisma.usuario.findMany({
    where: { salaoId: salao.id, role: 'admin' },
    select: { email: true, nome: true }
  });

  if (admins.length > 0) {
    const { enviarComunicado } = require('./emailService');
    const destinatarios = admins.map(a => a.email);
    
    try {
      await enviarComunicado({
        destinatarios,
        assunto: `⚠️ URGENTE: Seu WhatsApp Desconectou - ${salao.nome}`,
        mensagem: `Olá!\n\nIdentificamos que a conexão do WhatsApp do salão **${salao.nome}** caiu ou foi desconectada.\n\nPara voltar a receber e enviar mensagens (incluindo lembretes de clientes), acesse o painel imediatamente e leia o QR Code novamente na aba WhatsApp.\n\nAtenciosamente,\nEquipe de Suporte`
      });
    } catch (err) {
      console.error(`Falha ao enviar email de queda do WhatsApp para ${salao.nome}`, err);
    }
  }

  lastAlerted.set(salao.id, agora);
}

function iniciarMonitorEvolution() {
  // Roda a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    try {
      const saloes = await prisma.salao.findMany({
        where: { moduloWhatsapp: true, ativo: true },
      });

      for (const salao of saloes) {
        if (!salao.evolutionUrl || !salao.evolutionKey) continue;

        try {
          // Passando null para o req, pois não estamos em um request HTTP
          const result = await getEvolutionStatus(salao, null);
          const state = result?.status;

          if (state !== 'open' && state !== 'connecting') {
            await notificarQuedaWhatsapp(salao);
          } else if (state === 'open') {
            // Se conectou, limpamos o cooldown
            if (lastAlerted.has(salao.id)) {
              lastAlerted.delete(salao.id);
            }
          }
        } catch (err) {
          console.error(`Erro ao monitorar Evolution do salão ${salao.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Erro geral no monitor da Evolution:', err);
    }
  });
}

module.exports = { iniciarMonitorEvolution };
