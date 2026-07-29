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
    process.env.BACKEND_WEBHOOK_URL
      || process.env.BACKEND_PUBLIC_URL
      || process.env.API_PUBLIC_URL
      || process.env.API_URL
      || ''
  );
  if (explicit) return explicit;

  const appUrl = trimSlash(process.env.APP_URL || '');
  if (appUrl) {
    const backendPort = String(process.env.PORT || '3001').trim();
    return appUrl
      .replace(':5173', `:${backendPort}`)
      .replace(':5174', `:${backendPort}`);
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
    || data?.data?.base64
    || data?.data?.qrcode
    || data?.data?.Qrcode
    || data?.Qrcode
    || data?.qrcode?.base64
    || data?.qr?.base64
    || data?.qrcode
    || data?.qr
    || data?.connection?.qrcode
    || (typeof data?.code === 'string' && data.code.startsWith('data:image') ? data.code : '')
    || (typeof data?.Qrcode === 'string' && data.Qrcode.startsWith('data:image') ? data.Qrcode : '')
    || (typeof data?.data?.Qrcode === 'string' && data.data.Qrcode.startsWith('data:image') ? data.data.Qrcode : '')
    || ''
  );
}

function extractConnectionState(data) {
  const connectionData = data?.data || data;
  const isConnected = connectionData?.connected === true
    || connectionData?.Connected === true
    || connectionData?.LoggedIn === true;

  if (isConnected) return 'open';

  const rawState = String(
    data?.instance?.state
    || data?.instance?.connectionStatus
    || data?.instance?.status
    || connectionData?.state
    || connectionData?.connectionStatus
    || connectionData?.status
    || data?.connectionStatus
    || data?.state
    || data?.status
    || 'close'
  ).toLowerCase();

  if (rawState === 'open' || rawState === 'connected') return 'open';
  if (rawState === 'connecting' || rawState === 'connecting_state') return 'connecting';
  return 'close';
}

function getEvolutionErrorMessage(error) {
  return String(
    error?.response?.data?.response?.message?.[0]
    || error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || ''
  ).trim();
}

function isInstanceAlreadyExistsError(error) {
  const status = Number(error?.response?.status || 0);
  const text = getEvolutionErrorMessage(error).toLowerCase();

  return status === 409
    || text.includes('already exists')
    || text.includes('already in use')
    || text.includes('já existe')
    || text.includes('em uso');
}

function isInstanceMissingError(error) {
  const status = Number(error?.response?.status || 0);
  const text = getEvolutionErrorMessage(error).toLowerCase();

  if (isInstanceAlreadyExistsError(error)) return false;

  return status === 404
    || text.includes('not found')
    || text.includes('does not exist')
    || text.includes('not created')
    || text.includes('não existe')
    || text.includes('nao existe');
}

async function fetchInstances(config) {
  const errors = [];

  try {
    const response = await evolutionRequest(config, 'get', '/instance/fetchInstances');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.instances)) return data.instances;
    if (Array.isArray(data?.data)) return data.data;
  } catch (error) {
    errors.push(error);
    try {
      const response = await evolutionRequest(config, 'get', '/instance/all');
      const data = response.data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
    } catch (error) {
      errors.push(error);
      // Ignora erro se não encontrar
    }
  }
  const unexpectedError = errors.find((error) => !isInstanceMissingError(error));
  if (unexpectedError) throw unexpectedError;

  return [];
}

function getInstanceName(item) {
  return item?.instance?.instanceName || item?.name || item?.instanceName;
}

async function getInstanceQr(config, req) {
  const paths = [
    `/instance/connect/${config.instanceName}`,
    `/instance/${config.instanceName}/qrcode`,
  ];
  let firstError = null;

  for (const path of paths) {
    try {
      const response = await evolutionRequest(config, 'get', path);
      const qr = extractQrPayload(response.data);
      if (qr) return { response, qr };
    } catch (error) {
      firstError = firstError || error;
      if (!isInstanceMissingError(error)) throw error;
    }
  }

  const goConfig = await getGoInstanceConfig(config);
  const requestConfigs = [goConfig];
  if (goConfig.apiKey !== config.apiKey) requestConfigs.push(config);
  const connectPayload = { immediate: true };
  const webhookUrl = buildWebhookUrl(req);
  if (webhookUrl) connectPayload.webhookUrl = webhookUrl;
  let connectStarted = false;

  // Evolution GO starts the pairing process with POST /instance/connect;
  // the QR is then read from GET /instance/qr.
  for (const requestConfig of requestConfigs) {
    try {
      await evolutionRequest(requestConfig, 'post', '/instance/connect', connectPayload);
      connectStarted = true;
      break;
    } catch (error) {
      firstError = firstError || error;
      if (isInstanceMissingError(error)) continue;
      if (requestConfig !== requestConfigs[requestConfigs.length - 1]) continue;
      break;
    }
  }

  let lastResponse = null;
  const maxAttempts = connectStarted ? 8 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (const requestConfig of requestConfigs) {
      try {
        const response = await evolutionRequest(requestConfig, 'get', '/instance/qr');
        lastResponse = response;
        const qr = extractQrPayload(response.data);
        if (qr) return { response, qr };
      } catch (error) {
        firstError = firstError || error;
        if (isInstanceMissingError(error)) continue;
        if (requestConfig !== requestConfigs[requestConfigs.length - 1]) continue;
      }
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  if (connectStarted) {
    return { response: lastResponse || { data: {} }, qr: '' };
  }

  throw firstError;
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
  }).catch(() => null);
}

async function getGoInstanceConfig(config) {
  try {
    const instances = await fetchInstances(config);
    const match = instances.find((item) => {
      const name = getInstanceName(item);
      return String(name || '').toLowerCase() === String(config.instanceName).toLowerCase();
    });
    if (match && match.token) {
      return { ...config, apiKey: match.token, instanceToken: match.token };
    }
  } catch {
    // Mantém a config original se falhar
  }
  return config;
}

async function createEvolutionInstance(salao, req, { qrcode = true } = {}) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('Evolution API nao configurada');
    error.statusCode = 400;
    throw error;
  }

  const webhookUrl = buildWebhookUrl(req);
  const instanceToken = String(
    salao?.evolutionKey ||
    salao?.id ||
    (config.apiKey && config.apiKey !== getGlobalEvolutionApiKey() ? config.apiKey : '') ||
    config.instanceName ||
    `token-${Date.now()}`
  ).trim();

  const payload = {
    instanceName: config.instanceName,
    name: config.instanceName,
    integration: 'WHATSAPP-BAILEYS',
    token: instanceToken,
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

  let response;
  try {
    response = await evolutionRequest(config, 'post', '/instance/create', payload);
  } catch (err) {
    if (!isInstanceAlreadyExistsError(err)) {
      throw err;
    }

    // A duplicate create is normal when the instance was created in the
    // Evolution panel or when two connect requests race. Reuse it instead
    // of deleting a valid instance.
    const existing = await getInstanceQr(config, req);
    await ensureInstanceWebhook(config, req).catch(() => null);
    return {
      config,
      data: existing.response.data,
      qr: existing.qr,
    };
  }

  return {
    config: { ...config, apiKey: instanceToken },
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
      const name = getInstanceName(item);
      return String(name || '').toLowerCase() === String(config.instanceName).toLowerCase();
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

    // Evolution GO authenticates instance routes with the token returned by
    // /instance/all and exposes status at /instance/status.
    const goConfig = await getGoInstanceConfig(config);
    try {
      const response = await evolutionRequest(goConfig, 'get', '/instance/status');
      return {
        status: extractConnectionState(response.data),
        config: goConfig,
        raw: response.data,
      };
    } catch (error) {
      // A 400 from GO means the client is not ready yet. Do not fall through
      // to the legacy API routes and report the wrong instance as missing.
      if (Number(error?.response?.status || 0) === 400) {
        return {
          status: 'close',
          config: goConfig,
          error: getEvolutionErrorMessage(error) || 'Instância Evolution GO desconectada',
        };
      }

      if (!isInstanceMissingError(error)) throw error;
    }

    try {
      const response = await evolutionRequest(config, 'get', `/instance/connectionState/${config.instanceName}`);
      return {
        status: extractConnectionState(response.data),
        config,
        raw: response.data,
      };
    } catch (error) {
      if (!isInstanceMissingError(error)) throw error;

      const response = await evolutionRequest(config, 'get', `/instance/${config.instanceName}/status`);
      return {
        status: extractConnectionState(response.data),
        config,
        raw: response.data,
      };
    }
  } catch (error) {
    if (isInstanceMissingError(error)) {
      return { status: 'not_created', config };
    }

    return {
      status: 'close',
      config,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
    };
  }
}

async function connectEvolutionInstance(salao, req) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('Configure a Evolution API primeiro');
    error.statusCode = 400;
    throw error;
  }

  // 1. Tenta obter o QR code diretamente da instância caso já esteja pronta para conexão
  try {
    const { response, qr } = await getInstanceQr(config, req);
    await ensureInstanceWebhook(config, req).catch(() => null);
    return {
      ...response.data,
      base64: qr,
      status: 'connecting',
    };
  } catch (error) {
    if (!isInstanceMissingError(error)) throw error;
    // Se a instância estiver em estado inválido, recria para gerar um novo QR Code
  }

  const created = await createEvolutionInstance(salao, req, { qrcode: true });
  let qr = created.qr;

  if (!qr) {
    try {
      const qrResponse = await getInstanceQr(config, req);
      qr = qrResponse.qr;
    } catch (error) {
      if (!isInstanceMissingError(error)) throw error;
    }
  }

  await ensureInstanceWebhook(config, req).catch(() => null);
  return {
    ...created.data,
    base64: qr,
    status: 'connecting',
  };
}

async function disconnectEvolutionInstance(salao) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('Configure a Evolution API primeiro');
    error.statusCode = 400;
    throw error;
  }

  const goConfig = await getGoInstanceConfig(config);
  if (goConfig.apiKey !== config.apiKey) {
    await evolutionRequest(goConfig, 'post', '/instance/disconnect');
    return { ok: true };
  }

  try {
    await evolutionRequest(config, 'delete', `/instance/logout/${config.instanceName}`);
  } catch {
    await evolutionRequest(config, 'delete', '/instance/logout');
  }
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

  const normalizedNumber = normalizeWhatsappNumber(number);
  const goConfig = await getGoInstanceConfig(config);

  try {
    await evolutionRequest(goConfig, 'post', '/send/text', {
      number: normalizedNumber,
      text,
    });
  } catch {
    await evolutionRequest(config, 'post', `/message/sendText/${config.instanceName}`, {
      number: normalizedNumber,
      text,
    });
  }

  return { ok: true };
}

async function fetchEvolutionProfilePictureUrl(salao, number) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) return '';

  const normalizedNumber = normalizeWhatsappNumber(number);
  const parseResponse = (response) => String(
    response?.data?.profilePictureUrl
    || response?.data?.picture
    || response?.data?.url
    || response?.data?.avatarUrl
    || response?.data?.data?.avatarUrl
    || ''
  ).trim();

  try {
    const response = await evolutionRequest(config, 'post', `/chat/fetchProfilePictureUrl/${config.instanceName}`, {
      number: normalizedNumber,
    });
    return parseResponse(response);
  } catch {
    return '';
  }
}

async function sendEvolutionMedia(
  salao,
  number,
  {
    media,
    mediatype = 'document',
    mimetype = 'application/octet-stream',
    caption = '',
    fileName = 'arquivo',
  } = {}
) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('WhatsApp nao configurado');
    error.statusCode = 400;
    throw error;
  }

  const normalizedNumber = normalizeWhatsappNumber(number);
  const goConfig = await getGoInstanceConfig(config);

  try {
    await evolutionRequest(goConfig, 'post', '/send/media', {
      number: normalizedNumber,
      mediatype,
      mimetype,
      caption: caption || fileName || 'Arquivo enviado',
      media,
      fileName,
    });
  } catch {
    await evolutionRequest(config, 'post', `/message/sendMedia/${config.instanceName}`, {
      number: normalizedNumber,
      mediatype,
      mimetype,
      caption: caption || fileName || 'Arquivo enviado',
      media,
      fileName,
    });
  }

  return { ok: true };
}

async function sendEvolutionAudio(salao, number, audioInput) {
  const config = resolveEvolutionConfig(salao);
  if (!config.configured) {
    const error = new Error('WhatsApp nao configurado');
    error.statusCode = 400;
    throw error;
  }

  const audio = typeof audioInput === 'string' ? audioInput : audioInput?.audio;
  const mimetype = typeof audioInput === 'string' ? 'audio/webm' : audioInput?.mimetype || 'audio/webm';
  const fileName = typeof audioInput === 'string' ? 'audio.webm' : audioInput?.fileName || 'audio.webm';

  try {
    await evolutionRequest(config, 'post', `/message/sendWhatsAppAudio/${config.instanceName}`, {
      number: normalizeWhatsappNumber(number),
      audio,
      audioMessage: {
        audio,
      },
      options: {
        encoding: true,
        presence: 'recording',
      },
    });
  } catch {
    await sendEvolutionMedia(salao, number, {
      media: audio,
      mediatype: 'audio',
      mimetype,
      fileName,
      caption: fileName,
    });
  }

  return { ok: true };
}

module.exports = {
  DEFAULT_WEBHOOK_EVENTS,
  buildWebhookUrl,
  connectEvolutionInstance,
  createEvolutionInstance,
  disconnectEvolutionInstance,
  fetchEvolutionProfilePictureUrl,
  getEvolutionStatus,
  getGlobalEvolutionApiKey,
  normalizeWhatsappNumber,
  resolveEvolutionConfig,
  sendEvolutionAudio,
  sendEvolutionMedia,
  sendEvolutionText,
};
