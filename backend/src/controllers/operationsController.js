const prisma = require('../lib/prisma');

const INVOICE_OPEN_STATUSES = new Set(['aberta', 'comprovante_enviado']);
const TICKET_FINAL_STATUSES = new Set(['resolvido', 'fechado']);
const DEFAULT_PLAN_PRICES = { basic: 99, pro: 199, enterprise: 499 };
const DEFAULT_BILLING_DUE_DAY = 10;

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} invalido`);
    error.statusCode = 400;
    throw error;
  }

  return date;
}

function createPixPayload(settings, invoice) {
  return [
    `PIX|${settings.chavePix}`,
    `Recebedor:${settings.nomeRecebedor}`,
    `Cidade:${settings.cidadeRecebedor}`,
    `Valor:${Number(invoice.valor || 0).toFixed(2)}`,
    `Referencia:${invoice.competencia}`,
    settings.descricaoPadrao ? `Descricao:${settings.descricaoPadrao}` : null,
  ].filter(Boolean).join('|');
}

function deriveInvoiceStatus(invoice) {
  if (!invoice) return 'aberta';
  if (invoice.status === 'paga' || invoice.status === 'cancelada') return invoice.status;

  if (invoice.vencimento && new Date(invoice.vencimento) < new Date() && invoice.status === 'aberta') {
    return 'vencida';
  }

  return invoice.status;
}

function serializeInvoice(invoice) {
  return {
    ...invoice,
    status: deriveInvoiceStatus(invoice),
  };
}

function serializeTicket(ticket) {
  return {
    ...ticket,
    mensagens: (ticket.mensagens || []).map((mensagem) => ({
      ...mensagem,
      anexos: Array.isArray(mensagem.anexos) ? mensagem.anexos : [],
    })),
  };
}

function clampDueDay(value) {
  const dueDay = Number(value);
  if (!Number.isInteger(dueDay)) return DEFAULT_BILLING_DUE_DAY;
  return Math.max(1, Math.min(28, dueDay));
}

function getPlanPrices(settings) {
  return {
    basic: Number(settings?.basicPrice ?? DEFAULT_PLAN_PRICES.basic),
    pro: Number(settings?.proPrice ?? DEFAULT_PLAN_PRICES.pro),
    enterprise: Number(settings?.enterprisePrice ?? DEFAULT_PLAN_PRICES.enterprise),
  };
}

function getCompetenciaLabel(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${year}`;
}

function getDueDateForCycle(referenceDate, dueDay) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  return new Date(Date.UTC(year, month, clampDueDay(dueDay), 12, 0, 0));
}

async function ensureAutomaticInvoices(referenceDate = new Date()) {
  const settings = await prisma.billingSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!settings?.autoBillingEnabled) {
    return { settings, created: [], skipped: [], competencia: getCompetenciaLabel(referenceDate) };
  }

  const competencia = getCompetenciaLabel(referenceDate);
  const dueDate = getDueDateForCycle(referenceDate, settings.dueDay);
  const planPrices = getPlanPrices(settings);
  const saloes = await prisma.salao.findMany({
    where: {
      ativo: true,
      planoStatus: { in: ['ativo', 'inadimplente'] },
      plano: { in: ['basic', 'pro', 'enterprise'] },
    },
    select: { id: true, nome: true, plano: true },
    orderBy: { createdAt: 'asc' },
  });

  const created = [];
  const skipped = [];

  for (const salao of saloes) {
    const valor = Number(planPrices[salao.plano] || 0);
    if (valor <= 0) {
      skipped.push({ salaoId: salao.id, reason: 'plano_sem_valor' });
      continue;
    }

    const existing = await prisma.invoice.findFirst({
      where: {
        salaoId: salao.id,
        competencia,
        status: { not: 'cancelada' },
      },
      select: { id: true },
    });

    if (existing) {
      skipped.push({ salaoId: salao.id, reason: 'ja_existe' });
      continue;
    }

    const invoiceData = {
      salaoId: salao.id,
      competencia,
      descricao: `Plano BellaPro ${String(salao.plano).toUpperCase()} - ${competencia}`,
      valor,
      vencimento: dueDate,
      status: 'aberta',
      pixNomeRecebedor: settings.nomeRecebedor,
      pixCpfCnpjRecebedor: settings.cpfCnpjRecebedor,
      pixChave: settings.chavePix,
      pixCidadeRecebedor: settings.cidadeRecebedor,
      pixDescricao: settings.descricaoPadrao || null,
      observacoesInternas: 'Fatura gerada automaticamente a partir do plano do salao.',
    };

    const invoice = await prisma.invoice.create({
      data: {
        ...invoiceData,
        pixPayload: createPixPayload(settings, invoiceData),
      },
      include: {
        salao: {
          select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
        },
      },
    });

    created.push(serializeInvoice(invoice));
  }

  return { settings, created, skipped, competencia };
}

async function getBillingSettings(req, res) {
  const settings = await prisma.billingSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  res.json(settings || {
    nomeRecebedor: '',
    cpfCnpjRecebedor: '',
    chavePix: '',
    cidadeRecebedor: '',
    descricaoPadrao: '',
    instrucoesPagamento: '',
    basicPrice: DEFAULT_PLAN_PRICES.basic,
    proPrice: DEFAULT_PLAN_PRICES.pro,
    enterprisePrice: DEFAULT_PLAN_PRICES.enterprise,
    dueDay: DEFAULT_BILLING_DUE_DAY,
    autoBillingEnabled: true,
  });
}

async function upsertBillingSettings(req, res) {
  const {
    nomeRecebedor,
    cpfCnpjRecebedor,
    chavePix,
    cidadeRecebedor,
    descricaoPadrao,
    instrucoesPagamento,
    basicPrice,
    proPrice,
    enterprisePrice,
    dueDay,
    autoBillingEnabled,
  } = req.body;

  if (!nomeRecebedor || !cpfCnpjRecebedor || !chavePix || !cidadeRecebedor) {
    return res.status(400).json({ error: 'Preencha os campos obrigatorios do PIX' });
  }

  const existing = await prisma.billingSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  const data = {
    nomeRecebedor: String(nomeRecebedor).trim(),
    cpfCnpjRecebedor: String(cpfCnpjRecebedor).trim(),
    chavePix: String(chavePix).trim(),
    cidadeRecebedor: String(cidadeRecebedor).trim(),
    descricaoPadrao: descricaoPadrao ? String(descricaoPadrao).trim() : null,
    instrucoesPagamento: instrucoesPagamento ? String(instrucoesPagamento).trim() : null,
    basicPrice: Number(basicPrice ?? DEFAULT_PLAN_PRICES.basic),
    proPrice: Number(proPrice ?? DEFAULT_PLAN_PRICES.pro),
    enterprisePrice: Number(enterprisePrice ?? DEFAULT_PLAN_PRICES.enterprise),
    dueDay: clampDueDay(dueDay),
    autoBillingEnabled: autoBillingEnabled !== undefined ? Boolean(autoBillingEnabled) : true,
  };

  const settings = existing
    ? await prisma.billingSettings.update({ where: { id: existing.id }, data })
    : await prisma.billingSettings.create({ data });

  res.json(settings);
}

async function generateAutomaticInvoices(req, res) {
  const result = await ensureAutomaticInvoices();
  res.json({
    ok: true,
    competencia: result.competencia,
    criadas: result.created.length,
    ignoradas: result.skipped.length,
    faturas: result.created,
  });
}

async function listSuperAdminInvoices(req, res) {
  await ensureAutomaticInvoices();
  const { salaoId, status } = req.query;
  const where = {
    ...(salaoId ? { salaoId: String(salaoId) } : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      salao: {
        select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
      },
    },
    orderBy: [{ vencimento: 'desc' }, { createdAt: 'desc' }],
  });

  const serialized = invoices.map(serializeInvoice).filter((invoice) => !status || invoice.status === status);
  res.json(serialized);
}

async function createInvoice(req, res) {
  const {
    salaoId,
    competencia,
    descricao,
    valor,
    vencimento,
    observacoesInternas,
  } = req.body;

  if (!salaoId || !competencia || !valor || !vencimento) {
    return res.status(400).json({ error: 'salaoId, competencia, valor e vencimento sao obrigatorios' });
  }

  const [settings, salao] = await Promise.all([
    prisma.billingSettings.findFirst({ orderBy: { createdAt: 'asc' } }),
    prisma.salao.findUnique({ where: { id: salaoId }, select: { id: true, nome: true } }),
  ]);

  if (!settings) {
    return res.status(400).json({ error: 'Configure o PIX no superadmin antes de emitir faturas' });
  }

  if (!salao) {
    return res.status(404).json({ error: 'Salao nao encontrado' });
  }

  const invoiceData = {
    salaoId,
    competencia: String(competencia).trim(),
    descricao: descricao ? String(descricao).trim() : null,
    valor: Number(valor),
    vencimento: parseDate(vencimento, 'vencimento'),
    status: 'aberta',
    pixNomeRecebedor: settings.nomeRecebedor,
    pixCpfCnpjRecebedor: settings.cpfCnpjRecebedor,
    pixChave: settings.chavePix,
    pixCidadeRecebedor: settings.cidadeRecebedor,
    pixDescricao: settings.descricaoPadrao || null,
    observacoesInternas: observacoesInternas ? String(observacoesInternas).trim() : null,
  };

  const invoice = await prisma.invoice.create({
    data: {
      ...invoiceData,
      pixPayload: createPixPayload(settings, invoiceData),
    },
    include: {
      salao: {
        select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
      },
    },
  });

  res.status(201).json(serializeInvoice(invoice));
}

async function updateInvoice(req, res) {
  const { id } = req.params;
  const {
    status,
    valorPago,
    pagoEm,
    observacoesInternas,
    comprovanteUrl,
    comprovanteNome,
  } = req.body;

  const current = await prisma.invoice.findUnique({ where: { id } });
  if (!current) {
    return res.status(404).json({ error: 'Fatura nao encontrada' });
  }

  const data = {
    ...(status !== undefined ? { status } : {}),
    ...(valorPago !== undefined ? { valorPago: Number(valorPago) } : {}),
    ...(pagoEm !== undefined ? { pagoEm: pagoEm ? parseDate(pagoEm, 'pagoEm') : null } : {}),
    ...(observacoesInternas !== undefined ? { observacoesInternas } : {}),
    ...(comprovanteUrl !== undefined ? { comprovanteUrl } : {}),
    ...(comprovanteNome !== undefined ? { comprovanteNome } : {}),
  };

  if (status === 'paga' && !data.pagoEm) {
    data.pagoEm = new Date();
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data,
    include: {
      salao: {
        select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
      },
    },
  });

  res.json(serializeInvoice(updated));
}

async function listAdminInvoices(req, res) {
  await ensureAutomaticInvoices();
  const invoices = await prisma.invoice.findMany({
    where: { salaoId: req.user.salaoId },
    orderBy: [{ vencimento: 'desc' }, { createdAt: 'desc' }],
  });

  res.json(invoices.map(serializeInvoice));
}

async function getAdminInvoiceSummary(req, res) {
  await ensureAutomaticInvoices();
  const invoices = await prisma.invoice.findMany({
    where: {
      salaoId: req.user.salaoId,
      status: { in: ['aberta', 'comprovante_enviado', 'paga', 'cancelada'] },
    },
    orderBy: [{ vencimento: 'asc' }, { createdAt: 'asc' }],
  });

  const serialized = invoices.map(serializeInvoice);
  const abertas = serialized.filter((item) => ['aberta', 'comprovante_enviado'].includes(item.status)).length;
  const vencidas = serialized.filter((item) => item.status === 'vencida').length;
  const totalPendencias = serialized.filter((item) => ['aberta', 'comprovante_enviado', 'vencida'].includes(item.status)).length;
  const proxima = serialized.find((item) => ['aberta', 'comprovante_enviado', 'vencida'].includes(item.status)) || null;

  res.json({
    abertas,
    vencidas,
    totalPendencias,
    temPendencia: totalPendencias > 0,
    proxima,
  });
}

async function submitInvoiceProof(req, res) {
  const { id } = req.params;
  const { comprovanteUrl, comprovanteNome } = req.body;

  if (!comprovanteUrl) {
    return res.status(400).json({ error: 'Envie o comprovante antes de confirmar' });
  }

  const current = await prisma.invoice.findFirst({
    where: { id, salaoId: req.user.salaoId },
  });

  if (!current) {
    return res.status(404).json({ error: 'Fatura nao encontrada' });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      comprovanteUrl,
      comprovanteNome: comprovanteNome || null,
      comprovanteEnviadoEm: new Date(),
      status: current.status === 'paga' ? current.status : 'comprovante_enviado',
    },
  });

  res.json(serializeInvoice(updated));
}

async function listSuperAdminTickets(req, res) {
  const { status, salaoId } = req.query;
  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(salaoId ? { salaoId: String(salaoId) } : {}),
    },
    include: {
      salao: {
        select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
      },
      mensagens: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  res.json(tickets.map(serializeTicket));
}

async function updateSuperAdminTicket(req, res) {
  const { id } = req.params;
  const { status, prioridade, responsavelNome } = req.body;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket nao encontrado' });
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(prioridade !== undefined ? { prioridade } : {}),
      ...(responsavelNome !== undefined ? { responsavelNome: responsavelNome || null } : {}),
      ...(status === 'resolvido' ? { resolvidoEm: new Date() } : {}),
      ...(status && !TICKET_FINAL_STATUSES.has(status) ? { resolvidoEm: null } : {}),
    },
    include: {
      salao: {
        select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
      },
      mensagens: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  res.json(serializeTicket(updated));
}

async function addSuperAdminTicketMessage(req, res) {
  const { id } = req.params;
  const { mensagem, anexos, status } = req.body;

  if (!mensagem) {
    return res.status(400).json({ error: 'Mensagem obrigatoria' });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket nao encontrado' });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: {
        ticketId: id,
        autorTipo: 'superadmin',
        autorNome: req.superAdmin.email,
        autorSuperAdminId: req.superAdmin.id,
        mensagem: String(mensagem).trim(),
        anexos: Array.isArray(anexos) ? anexos.filter(Boolean) : [],
      },
    });

    return tx.supportTicket.update({
      where: { id },
      data: {
        status: status || 'aguardando_salao',
        ultimaInteracaoEm: new Date(),
        ...(status === 'resolvido' ? { resolvidoEm: new Date() } : {}),
        ...((status || 'aguardando_salao') !== 'resolvido' ? { resolvidoEm: null } : {}),
      },
      include: {
        salao: {
          select: { id: true, nome: true, slug: true, plano: true, planoStatus: true },
        },
        mensagens: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  res.json(serializeTicket(result));
}

async function listAdminTickets(req, res) {
  const tickets = await prisma.supportTicket.findMany({
    where: { salaoId: req.user.salaoId },
    include: {
      mensagens: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  res.json(tickets.map(serializeTicket));
}

async function createAdminTicket(req, res) {
  const { assunto, categoria, prioridade, descricao, anexoUrl } = req.body;

  if (!assunto || !categoria || !descricao) {
    return res.status(400).json({ error: 'Assunto, categoria e descricao sao obrigatorios' });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { nome: true, email: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        salaoId: req.user.salaoId,
        assunto: String(assunto).trim(),
        categoria: String(categoria).trim(),
        prioridade: prioridade || 'normal',
        descricao: String(descricao).trim(),
        status: 'aberto',
        ultimaInteracaoEm: new Date(),
      },
    });

    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        autorTipo: 'salao',
        autorNome: usuario?.nome || usuario?.email || 'Salao',
        autorUsuarioId: req.user.id,
        mensagem: String(descricao).trim(),
        anexos: anexoUrl ? [String(anexoUrl)] : [],
      },
    });

    return tx.supportTicket.findUnique({
      where: { id: ticket.id },
      include: {
        mensagens: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  res.status(201).json(serializeTicket(result));
}

async function addAdminTicketMessage(req, res) {
  const { id } = req.params;
  const { mensagem, anexoUrl } = req.body;

  if (!mensagem) {
    return res.status(400).json({ error: 'Mensagem obrigatoria' });
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, salaoId: req.user.salaoId },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket nao encontrado' });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { nome: true, email: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: {
        ticketId: id,
        autorTipo: 'salao',
        autorNome: usuario?.nome || usuario?.email || 'Salao',
        autorUsuarioId: req.user.id,
        mensagem: String(mensagem).trim(),
        anexos: anexoUrl ? [String(anexoUrl)] : [],
      },
    });

    return tx.supportTicket.update({
      where: { id },
      data: {
        status: TICKET_FINAL_STATUSES.has(ticket.status) ? 'aberto' : 'aguardando_superadmin',
        ultimaInteracaoEm: new Date(),
        resolvidoEm: null,
      },
      include: {
        mensagens: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  res.json(serializeTicket(result));
}

module.exports = {
  getBillingSettings,
  upsertBillingSettings,
  generateAutomaticInvoices,
  listSuperAdminInvoices,
  createInvoice,
  updateInvoice,
  listAdminInvoices,
  getAdminInvoiceSummary,
  submitInvoiceProof,
  listSuperAdminTickets,
  updateSuperAdminTicket,
  addSuperAdminTicketMessage,
  listAdminTickets,
  createAdminTicket,
  addAdminTicketMessage,
  ensureAutomaticInvoices,
  getPlanPrices,
};
