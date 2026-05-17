const cron = require('node-cron');
const { ensureAutomaticInvoices } = require('../controllers/operationsController');

function iniciarBillingAutomatico() {
  cron.schedule('15 6 * * *', async () => {
    try {
      const result = await ensureAutomaticInvoices();
      console.log(`[Billing] ciclo ${result.competencia}: ${result.created.length} faturas criadas, ${result.skipped.length} ignoradas`);
    } catch (error) {
      console.error('[Billing] Falha ao gerar faturas automaticas', error);
    }
  });
}

module.exports = { iniciarBillingAutomatico };
