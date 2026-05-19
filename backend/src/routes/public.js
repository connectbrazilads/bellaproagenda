const router = require('express').Router();
const ctrl = require('../controllers/publicController');
const { createRateLimiter } = require('../lib/security');

const bookingLookupRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: 'Muitas consultas de disponibilidade. Aguarde um instante e tente novamente.',
  keyParts: [
    (req) => req.params?.slug,
    (req) => req.query?.profissionalId,
  ],
});

const bookingCreateRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Muitas tentativas de agendamento. Aguarde alguns minutos e tente novamente.',
  keyParts: [
    (req) => req.params?.slug,
    (req) => req.body?.clienteTelefone,
  ],
});

router.get('/:slug/salao', ctrl.getSalao);
router.get('/:slug/servicos', ctrl.getServicos);
router.get('/:slug/pacotes', ctrl.getPacotesPublicos);
router.get('/:slug/profissionais', ctrl.getProfissionaisPublicos);
router.get('/:slug/profissionais/:servicoId', ctrl.getProfissionaisPorServico);
router.get('/:slug/profissionais-pacote/:pacoteId', ctrl.getProfissionaisPorPacote);
router.get('/:slug/datas-disponiveis', bookingLookupRateLimiter, ctrl.getDatasDisponiveisHandler);
router.get('/:slug/horarios-disponiveis', bookingLookupRateLimiter, ctrl.getHorariosDisponiveisHandler);
router.post('/:slug/agendamentos', bookingCreateRateLimiter, ctrl.criarAgendamento);

module.exports = router;
