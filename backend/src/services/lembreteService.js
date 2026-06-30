const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { enviarLembrete } = require('./whatsappService');

function iniciarLembretes() {
  // Roda a cada 15 minutos para verificar agendamentos próximos
  cron.schedule('*/15 * * * *', async () => {
    try {
      const agora = new Date();
      
      // Busca todos os agendamentos futuros não cancelados e cujo lembrete não foi enviado
      const agendamentos = await prisma.agendamento.findMany({
        where: {
          data: { gte: new Date(agora.toISOString().split('T')[0] + 'T00:00:00') },
          status: { not: 'cancelado' },
          lembreteEnviado: false
        },
        include: { servico: true, pacote: true, profissional: true, salao: true },
      });

      let enviados = 0;

      for (const a of agendamentos) {
        if (!a.salao.moduloWhatsapp) continue;

        const antecedenciaHoras = a.salao.lembreteAntecedencia ?? 6;
        
        // Formar a data exata do agendamento com o horário
        const dataAgendamento = new Date(a.data);
        const [hora, min] = (a.inicioHora || '00:00').split(':');
        dataAgendamento.setHours(Number(hora), Number(min), 0, 0);

        // Diferença em horas
        const diffMs = dataAgendamento.getTime() - agora.getTime();
        const diffHoras = diffMs / (1000 * 60 * 60);

        // Se a diferença for menor ou igual à antecedência configurada e ainda for no futuro
        if (diffHoras > 0 && diffHoras <= antecedenciaHoras) {
          await enviarLembrete({
            clienteNome: a.clienteNome,
            clienteTelefone: a.clienteTelefone,
            servico: a.servico?.nome || a.pacote?.nome || 'Serviço',
            profissional: a.profissional.nome,
            data: a.data.toISOString().split('T')[0],
            hora: a.inicioHora,
            salao: a.salao,
          });

          // Marca como enviado
          await prisma.agendamento.update({
            where: { id: a.id },
            data: { lembreteEnviado: true }
          });

          enviados++;
        }
      }

      if (enviados > 0) {
        console.log(`Lembretes enviados: ${enviados}`);
      }
    } catch (err) {
      console.error('Erro na rotina de lembretes:', err);
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
}

module.exports = { iniciarLembretes };
