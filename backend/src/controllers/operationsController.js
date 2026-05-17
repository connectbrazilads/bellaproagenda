const prisma = require('../lib/prisma');

const INVOICE_OPEN_STATUSES = new Set(['aberta', 'comprovante_enviado']);
const TICKET_FINAL_STATUSES = new Set(['resolvido', 'fechado']);

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

async function getBillingSettings(req, res) {
  const settings = await prisma.billingSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  res.json(settings || null);
}

async function upsertBillingSettings(req, res) {
  const {
    nomeRecebedor,
    cpfCnpjRecebedor,
    chavePix,
    cidadeRecebedor,
    descricaoPadrao,
    instrucoesPagamento,
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
  };

  const settings = existing
    ? await prisma.billingSettings.update({ where: { id: existing.id }, data })
    : await prisma.billingSettings.create({ data });

  res.json(settings);
}

async function listSuperAdminInvoices(req, res) {
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
  const invoices = await prisma.invoice.findMany({
    where: { salaoId: req.user.salaoId },
    orderBy: [{ vencimento: 'desc' }, { createdAt: 'desc' }],
  });

  res.json(invoices.map(serializeInvoice));
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
  listSuperAdminInvoices,
  createInvoice,
  updateInvoice,
  listAdminInvoices,
  submitInvoiceProof,
  listSuperAdminTickets,
  updateSuperAdminTicket,
  addSuperAdminTicketMessage,
  listAdminTickets,
  createAdminTicket,
  addAdminTicketMessage,
};
