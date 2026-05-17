const router = require('express').Router();
const ctrl = require('../controllers/superAdminController');
const ops = require('../controllers/operationsController');
const { createRateLimiter } = require('../lib/security');

const superAdminLoginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login de super admin. Aguarde alguns minutos.',
  keyParts: [
    (req) => req.body?.email,
  ],
});

router.post('/login', superAdminLoginRateLimiter, ctrl.login);
router.get('/session', ctrl.authenticate, ctrl.getSession);
router.post('/logout', ctrl.logout);

router.use(ctrl.authenticate);

router.get('/metricas', ctrl.getMetricas);
router.get('/billing/settings', ops.getBillingSettings);
router.put('/billing/settings', ops.upsertBillingSettings);
router.get('/billing/faturas', ops.listSuperAdminInvoices);
router.post('/billing/faturas', ops.createInvoice);
router.put('/billing/faturas/:id', ops.updateInvoice);

router.get('/saloes/exportar', ctrl.exportarCSV);
router.get('/saloes', ctrl.listarSaloes);
router.post('/saloes', ctrl.criarSalao);
router.get('/saloes/:id', ctrl.getSalao);
router.put('/saloes/:id', ctrl.updateSalao);
router.delete('/saloes/:id', ctrl.deleteSalao);
router.post('/saloes/:id/impersonar', ctrl.impersonar);

router.post('/credenciais/enviar', ctrl.enviarCredenciais);
router.post('/comunicado', ctrl.enviarComunicadoMassa);
router.get('/suporte', ops.listSuperAdminTickets);
router.put('/suporte/:id', ops.updateSuperAdminTicket);
router.post('/suporte/:id/mensagens', ops.addSuperAdminTicketMessage);

router.put('/usuarios/:usuarioId/reset-senha', ctrl.resetSenhaUsuario);

module.exports = router;
