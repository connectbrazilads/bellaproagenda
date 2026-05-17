const crypto = require('crypto');

function validateStrongPassword(password) {
  const value = String(password || '');

  if (value.length < 8) {
    return 'A senha deve ter ao menos 8 caracteres';
  }
  if (!/[A-Z]/.test(value)) {
    return 'A senha deve ter ao menos 1 letra maiúscula';
  }
  if (!/[a-z]/.test(value)) {
    return 'A senha deve ter ao menos 1 letra minúscula';
  }
  if (!/[0-9]/.test(value)) {
    return 'A senha deve ter ao menos 1 número';
  }

  return null;
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isWebhookAuthorized(req) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return false;

  const candidates = [
    req.query?.token,
    req.headers['x-webhook-secret'],
    req.headers['x-evolution-webhook-secret'],
    req.body?.token,
    req.body?.secret,
  ];

  return candidates.some((candidate) => candidate && safeEqual(candidate, expected));
}

function getCookieValue(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;

  const prefix = `${name}=`;
  const parts = raw.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return null;
}

function getCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

function clearCookie(res, name) {
  res.clearCookie(name, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function getRequestIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function buildRateLimitKey(req, keyParts) {
  const baseParts = [getRequestIp(req)];

  for (const resolver of keyParts) {
    try {
      const value = resolver(req);
      if (value) {
        baseParts.push(String(value).trim().toLowerCase());
      }
    } catch {
      // Ignore dynamic key failures and fall back to IP-only throttling.
    }
  }

  return baseParts.join('|');
}

function createRateLimiter({
  windowMs,
  max,
  message,
  keyParts = [],
  skip = null,
}) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    if (skip?.(req)) {
      return next();
    }

    const now = Date.now();
    const key = buildRateLimitKey(req, keyParts);
    const current = hits.get(key);

    if (!current || current.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

function applySecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

module.exports = {
  applySecurityHeaders,
  createRateLimiter,
  clearCookie,
  getCookieOptions,
  getCookieValue,
  getRequestIp,
  isWebhookAuthorized,
  safeEqual,
  validateStrongPassword,
  generateResetToken,
};
