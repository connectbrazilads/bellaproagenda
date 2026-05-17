const router = require('express').Router();
const { handleWhatsapp } = require('../controllers/webhookController');
const { isWebhookAuthorized } = require('../lib/security');

function requireWebhookSecret(req, res, next) {
  if (!process.env.WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook nao configurado com segredo' });
  }

  if (!isWebhookAuthorized(req)) {
    return res.status(401).json({ error: 'Webhook nao autorizado' });
  }

  return next();
}

router.post('/whatsapp', requireWebhookSecret, handleWhatsapp);

module.exports = router;
