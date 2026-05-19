require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { iniciarLembretes } = require('./services/lembreteService');
const { iniciarBillingAutomatico } = require('./services/billingService');
const { criarSuperAdmin } = require('./controllers/superAdminController');
const { authenticate } = require('./controllers/authController');
const prisma = require('./lib/prisma');
const upload = require('./lib/upload');
const { applySecurityHeaders, validateStrongPassword } = require('./lib/security');

const app = express();

function getTrustProxySetting() {
  const raw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
  if (!raw) return 1;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) return asNumber;

  return raw;
}

app.set('trust proxy', getTrustProxySetting());

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    if (hostname.endsWith('.trycloudflare.com')) return true;

    const configuredOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return configuredOrigins.includes(origin) || configuredOrigins.includes(hostname);
  } catch {
    return false;
  }
}

function validateRuntimeSecrets() {
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET obrigatorio para iniciar o backend');
  }

  const webhookSecret = String(process.env.WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    throw new Error('WEBHOOK_SECRET obrigatorio para proteger os webhooks');
  }

  const superAdminEmail = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const superAdminPassword = String(process.env.SUPERADMIN_SENHA || '');

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error('SUPERADMIN_EMAIL e SUPERADMIN_SENHA sao obrigatorios');
  }

  if (superAdminEmail === 'superadmin@athena.com' || superAdminPassword === 'Athena@2026') {
    throw new Error('Credenciais padrao de super admin nao podem ser usadas');
  }

  const passwordError = validateStrongPassword(superAdminPassword);
  if (passwordError) {
    throw new Error(`SUPERADMIN_SENHA invalida: ${passwordError}`);
  }

  return {
    superAdminEmail,
    superAdminPassword,
  };
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origem nao permitida - ${origin}`));
    }
  },
  credentials: true,
}));
app.use(applySecurityHeaders);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

function getPublicApiBaseUrl(req) {
  const explicit = String(
    process.env.BACKEND_PUBLIC_URL
      || process.env.BACKEND_WEBHOOK_URL
      || process.env.API_PUBLIC_URL
      || process.env.API_URL
      || ''
  ).trim().replace(/\/+$/, '');

  if (explicit) return explicit;
  return `${req.protocol}://${req.get('host')}`;
}

app.post('/api/upload', authenticate, (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || 'Falha no upload' });
    }

    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const url = `${getPublicApiBaseUrl(req)}/uploads/${req.file.filename}`;
    return res.json({ url });
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/superadmin', require('./routes/superAdmin'));

app.get('/health', (req, res) => res.json({ ok: true }));

async function iniciar() {
  const { superAdminEmail, superAdminPassword } = validateRuntimeSecrets();

  await criarSuperAdmin(superAdminEmail, superAdminPassword);

  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Backend rodando na porta ${port}`);
    iniciarLembretes();
    iniciarBillingAutomatico();
  });
}

iniciar();
