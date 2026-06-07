const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { enviarLembrete } = require('./whatsappService');

function iniciarLembretes() {
  // Disparado diariamente às 18h para enviar lembretes aos agendamentos confirmados do dia seguinte
  cron.schedule('0 18 * * *', async () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const inicio = new Date(amanha.toISOString().split('T')[0] + 'T00:00:00');
    const fim = new Date(amanha.toISOString().split('T')[0] + 'T23:59:59');

    const agendamentos = await prisma.agendamento.findMany({
      where: { data: { gte: inicio, lte: fim }, status: 'confirmado' },
      include: { servico: true, profissional: true, salao: true },
    });

    for (const a of agendamentos) {
      await enviarLembrete({
        clienteNome: a.clienteNome,
        clienteTelefone: a.clienteTelefone,
        servico: a.servico?.nome || a.pacote?.nome || 'Serviço',
        profissional: a.profissional.nome,
        data: a.data.toISOString().split('T')[0],
        hora: a.inicioHora,
        salao: a.salao,
      });
    }

    console.log(`Lembretes enviados: ${agendamentos.length}`);
  }, {
    timezone: 'America/Sao_Paulo',
  });
}

module.exports = { iniciarLembretes };
