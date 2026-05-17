const router = require('express').Router();
const { authenticate, getSession, login, logout, signup, requestPasswordReset, resetPassword } = require('../controllers/authController');
const { createRateLimiter } = require('../lib/security');

const authKeyParts = [
  (req) => req.body?.email,
];

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
  keyParts: authKeyParts,
});

const signupRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Muitas tentativas de cadastro. Aguarde um pouco antes de tentar novamente.',
  keyParts: authKeyParts,
});

const passwordResetRequestRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Muitas solicitacoes de recuperacao. Aguarde antes de pedir outro link.',
  keyParts: authKeyParts,
});

const passwordResetRateLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de redefinicao. Tente novamente mais tarde.',
  keyParts: [
    (req) => req.body?.token,
  ],
});

router.post('/login', loginRateLimiter, login);
router.post('/signup', signupRateLimiter, signup);
router.post('/request-password-reset', passwordResetRequestRateLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetRateLimiter, resetPassword);
router.get('/session', authenticate, getSession);
router.post('/logout', logout);

module.exports = router;
