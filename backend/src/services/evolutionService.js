const axios = require('axios');

const DEFAULT_WEBHOOK_EVENTS = [
  'QRCODE_UPDATED',
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'MESSAGES_DELETE',
  'SEND_MESSAGE',
  'CONNECTION_UPDATE',
];

function trimSlash(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getGlobalEvolutionApiKey() {
  return String(process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_API_KEY || '').trim();
}

function resolveEvolutionConfig(salao) {
  const baseUrl = trimSlash(salao?.evolutionUrl || process.env.EVOLUTION_API_URL || '');
  const apiKey = String(salao?.evolutionKey || getGlobalEvolutionApiKey() || '').trim();
  const instanceName = String(salao?.evolutionInstance || process.env.EVOLUTION_INSTANCE || salao?.slug || '').trim();

  return {
    baseUrl,
    apiKey,
    instanceName,
    configured: Boolean(baseUrl && apiKey && instanceName),
    usingGlobalApiUrl: !salao?.evolutionUrl && Boolean(process.env.EVOLUTION_API_URL),
    usingGlobalApiKey: !salao?.evolutionKey && Boolean(getGlobalEvolutionApiKey()),
    usingGlobalInstance: !salao?.evolutionInstance && Boolean(process.env.EVOLUTION_INSTANCE || salao?.slug),
  };
}

function getBackendBaseUrl(req) {
  const explicit = trimSlash(
    process.env.BACKEND_PUBLIC_URL
      || process.env.API_PUBLIC_URL
      || process.env.API_URL
      || ''
  );
  if (explicit) return explicit;

  const appUrl = trimSlash(process.env.APP_URL || '');
  if (appUrl) {
    return appUrl
      .replace(':5173', ':3001')
      .replace(':5174', ':3001');
  }

  if (req) {
    return `${req.protocol}://${req.get('host')}`;
  }

  return '';
}

function buildWebhookUrl(req) {
  const baseUrl = getBackendBaseUrl(req);
  if (!baseUrl) return '';

  const secret = String(process.env.WEBHOOK_SECRET || '').trim();
  const url = `${baseUrl}/api/webhook/whatsapp`;
  return secret ? `${url}?token=${encodeURIComponent(secret)}` : url;
}

function getEvolutionHeaders(config) {
  return {
    apikey: config.apiKey,
  };
}

async function evolutionRequest(config, method, path, data) {
  return axios({
    method,
    url: `${config.baseUrl}${path}`,
    headers: getEvolutionHeaders(config),
    data,
  });
}

function extractQrPayload(data) {
  if (!data) return '';

  return (
    data?.base64
    || data?.qrcode?.base64
    || data?.qr?.base64
    || data?.qrcode
    || data?.qr
    || data?.connection?.qrcode
    || ''
  );
}

function extractConnectionState(data) {
  return (
    data?.instance?.state
    || data?.instance?.status
    || data?.state
    || data?.status
    || 'close'
  );
}

function isInstanceMissingError(error) {
  const status = Number(error?.response?.status || 0);
  const text = String(
    error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || ''
  ).toLowerCase();

  return status === 404 || text.includes('not found') || text.includes('instance') && text.includes('exist');
}

async function fetchInstances(config) {
  const response = await evolutionRequest(config, 'get', '/instance/fetchInstances');
  return Array.isArray(response.data) ? response.data : [];
}

async function ensureInstanceWebhook(config, req) {
  const webhookUrl = buildWebhookUrl(req);
  if (!webhookUrl) return null;

  return evolutionRequest(config, 'post', `/webhook/set/${config.instanceName}`, {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhookBase64: true,
    events: DEFAULT_WEBHOOK_EVENTS,
  });
}

async function createEvolutionInstance(salao, req, { qrcode = true } = {}) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('Evolution API nao configurada');
    error.statusCode = 400;
    throw error;
  }

  const webhookUrl = buildWebhookUrl(req);
  const payload = {
    instanceName: config.instanceName,
    integration: 'WHATSAPP-BAILEYS',
    token: '',
    qrcode,
    rejectCall: true,
    groupsIgnore: true,
    alwaysOnline: true,
    readMessages: true,
    readStatus: true,
    syncFullHistory: false,
  };

  if (webhookUrl) {
    payload.webhook = {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: true,
      events: DEFAULT_WEBHOOK_EVENTS,
    };
  }

  const response = await evolutionRequest(config, 'post', '/instance/create', payload);
  return {
    config,
    data: response.data,
    qr: extractQrPayload(response.data),
  };
}

async function ensureEvolutionInstance(salao, req, { qrcode = true } = {}) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('Configure a Evolution API primeiro');
    error.statusCode = 400;
    throw error;
  }

  try {
    const instances = await fetchInstances(config);
    const exists = instances.some((item) => {
      const name = item?.instance?.instanceName || item?.name || item?.instanceName;
      return String(name || '') === config.instanceName;
    });

    if (!exists) {
      return {
        created: true,
        ...(await createEvolutionInstance(salao, req, { qrcode })),
      };
    }
  } catch (error) {
    if (!isInstanceMissingError(error)) {
      throw error;
    }
  }

  await ensureInstanceWebhook(config, req).catch(() => null);
  return { created: false, config, data: null, qr: '' };
}

async function getEvolutionStatus(salao, req) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    return { status: 'not_configured', config };
  }

  try {
    await ensureInstanceWebhook(config, req).catch(() => null);
    const response = await evolutionRequest(config, 'get', `/instance/connectionState/${config.instanceName}`);
    return {
      status: extractConnectionState(response.data),
      config,
      raw: response.data,
    };
  } catch (error) {
    if (isInstanceMissingError(error)) {
      return { status: 'not_created', config };
    }

    return {
      status: 'error',
      config,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
}

async function connectEvolutionInstance(salao, req) {
  const ensured = await ensureEvolutionInstance(salao, req, { qrcode: true });
  if (ensured.qr) {
    return {
      ...ensured.data,
      base64: ensured.qr,
      status: 'connecting',
    };
  }

  const response = await evolutionRequest(ensured.config, 'get', `/instance/connect/${ensured.config.instanceName}`);
  await ensureInstanceWebhook(ensured.config, req).catch(() => null);

  return {
    ...response.data,
    base64: extractQrPayload(response.data),
  };
}

async function disconnectEvolutionInstance(salao) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('Configure a Evolution API primeiro');
    error.statusCode = 400;
    throw error;
  }

  await evolutionRequest(config, 'delete', `/instance/logout/${config.instanceName}`);
  return { ok: true };
}

function normalizeWhatsappNumber(number = '') {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function sendEvolutionText(salao, number, text) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('WhatsApp nao configurado');
    error.statusCode = 400;
    throw error;
  }

  await evolutionRequest(config, 'post', `/message/sendText/${config.instanceName}`, {
    number: normalizeWhatsappNumber(number),
    text,
  });

  return { ok: true };
}

module.exports = {
  DEFAULT_WEBHOOK_EVENTS,
  buildWebhookUrl,
  connectEvolutionInstance,
  createEvolutionInstance,
  disconnectEvolutionInstance,
  getEvolutionStatus,
  getGlobalEvolutionApiKey,
  normalizeWhatsappNumber,
  resolveEvolutionConfig,
  sendEvolutionText,
};
