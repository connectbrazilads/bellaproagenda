const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { clearCookie, getCookieOptions, getCookieValue, validateStrongPassword } = require('../lib/security');
const { enviarCredenciaisAcesso, enviarComunicado } = require('../services/emailService');
const { getPlanPrices } = require('./operationsController');

const SA_SECRET = process.env.SUPERADMIN_SECRET || `${process.env.JWT_SECRET}_sa`;
const SUPERADMIN_COOKIE_NAME = 'athena_superadmin_session';
const SUPERADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function issueSuperAdminSession(res, payload) {
  const token = jwt.sign(payload, SA_SECRET, { expiresIn: '12h' });
  res.cookie(SUPERADMIN_COOKIE_NAME, token, getCookieOptions(SUPERADMIN_SESSION_MAX_AGE_MS));
  return token;
}

function getSuperAdminTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }

  return getCookieValue(req, SUPERADMIN_COOKIE_NAME);
}

async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatorios' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email: normalizedEmail } });
  if (!superAdmin) return res.status(401).json({ error: 'Credenciais invalidas' });

  const ok = await bcrypt.compare(senha, superAdmin.senha);
  if (!ok) return res.status(401).json({ error: 'Credenciais invalidas' });

  const payload = { id: superAdmin.id, email: superAdmin.email, role: 'superadmin' };
  const token = issueSuperAdminSession(res, payload);
  const decoded = jwt.decode(token);

  res.json({
    token,
    nome: superAdmin.nome,
    email: superAdmin.email,
    expiresAt: decoded?.exp ? decoded.exp * 1000 : null,
  });
}

function authenticate(req, res, next) {
  const token = getSuperAdminTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Nao autorizado' });

  try {
    const payload = jwt.verify(token, SA_SECRET);
    if (payload.role !== 'superadmin') return res.status(403).json({ error: 'Acesso negado' });
    req.superAdmin = payload;
    next();
  } catch {
    clearCookie(res, SUPERADMIN_COOKIE_NAME);
    res.status(401).json({ error: 'Token invalido' });
  }
}

function getSession(req, res) {
  const token = getSuperAdminTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Sessao indisponivel' });

  try {
    const payload = jwt.verify(token, SA_SECRET);
    res.json({
      ok: true,
      superAdmin: payload,
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    });
  } catch {
    clearCookie(res, SUPERADMIN_COOKIE_NAME);
    res.status(401).json({ error: 'Sessao expirada' });
  }
}

function logout(req, res) {
  clearCookie(res, SUPERADMIN_COOKIE_NAME);
  res.json({ ok: true });
}

async function listarSaloes(req, res) {
  const agora = new Date();
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 86400000);
  const seteDiasAtras = new Date(agora.getTime() - 7 * 86400000);
  const quatorzeDiasAtras = new Date(agora.getTime() - 14 * 86400000);

  const saloes = await prisma.salao.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          profissionais: true,
          clientes: true,
          agendamentos: true,
          servicos: true,
          usuarios: true,
        },
      },
      usuarios: { select: { email: true, nome: true }, take: 1 },
      agendamentos: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  });

  const resultado = saloes.map((salao) => {
    const ultimoAg = salao.agendamentos[0]?.createdAt || null;
    const inativo = ultimoAg ? new Date(ultimoAg) < trintaDiasAtras : salao._count.agendamentos === 0;
    const trialExpirado = salao.planoStatus === 'trial' && new Date(salao.createdAt) < quatorzeDiasAtras;
    const recemCriado = new Date(salao.createdAt) > seteDiasAtras;

    const onboarding = {
      conta: true,
      whatsapp: !!salao.evolutionUrl,
      profissional: salao._count.profissionais > 0,
      servico: salao._count.servicos > 0,
      agendamento: salao._count.agendamentos > 0,
    };
    const onboardingScore = Object.values(onboarding).filter(Boolean).length;

    const alertas = [];
    if (trialExpirado) alertas.push('trial_expirado');
    if (salao.planoStatus === 'inadimplente') alertas.push('inadimplente');
    if (inativo && salao._count.agendamentos > 0) alertas.push('inativo');
    if (recemCriado) alertas.push('novo');

    return {
      id: salao.id,
      nome: salao.nome,
      slug: salao.slug,
      plano: salao.plano,
      planoStatus: salao.planoStatus,
      ativo: salao.ativo,
      telefone: salao.telefone,
      notaInterna: salao.notaInterna,
      createdAt: salao.createdAt,
      adminEmail: salao.usuarios[0]?.email || null,
      adminNome: salao.usuarios[0]?.nome || null,
      stats: {
        profissionais: salao._count.profissionais,
        clientes: salao._count.clientes,
        agendamentos: salao._count.agendamentos,
        servicos: salao._count.servicos,
        usuarios: salao._count.usuarios,
      },
      onboarding,
      onboardingScore,
      alertas,
    };
  });

  res.json(resultado);
}

async function getSalao(req, res) {
  const { id } = req.params;
  const salao = await prisma.salao.findUnique({
    where: { id },
    include: {
      usuarios: { select: { id: true, nome: true, email: true, role: true, createdAt: true } },
      _count: {
        select: {
          profissionais: true,
          clientes: true,
          agendamentos: true,
          servicos: true,
          pacotes: true,
        },
      },
    },
  });

  if (!salao) return res.status(404).json({ error: 'Salao nao encontrado' });

  const agendamentosConcluidos = await prisma.agendamento.findMany({
    where: { salaoId: id, status: 'concluido' },
    include: {
      servico: { select: { preco: true } },
      pacote: { select: { preco: true } },
      itens: true,
      produtos: true,
    },
  });
  const faturamentoTotal = agendamentosConcluidos.reduce(
    (acc, item) => {
      const precoBase = item.valorBaseAjustado ?? item.servico?.preco ?? item.pacote?.preco ?? 0;
      const precoItens = (item.itens || []).reduce((sum, agendamentoItem) => sum + Number(agendamentoItem.preco || 0), 0);
      const precoProdutos = (item.produtos || []).reduce((sum, produto) => sum + (Number(produto.preco || 0) * Number(produto.quantidade || 0)), 0);
      return acc + precoBase + precoItens + precoProdutos;
    },
    0
  );

  res.json({ ...salao, faturamentoTotal });
}

async function criarSalao(req, res) {
  const { nomeAdmin, email, senha, salaoNome, slug, plano, telefone } = req.body;

  if (!nomeAdmin || !email || !senha || !salaoNome || !slug) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatorios' });
  }

  const passwordError = validateStrongPassword(senha);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(senha, 10);
    const result = await prisma.$transaction(async (tx) => {
      return tx.salao.create({
        data: {
          nome: salaoNome,
          slug: slug.toLowerCase().trim(),
          plano: plano || 'basic',
          planoStatus: 'trial',
          ativo: true,
          telefone: telefone || null,
          usuarios: {
            create: { nome: nomeAdmin, email: normalizedEmail, senha: hash, role: 'admin' },
          },
        },
        include: { usuarios: { select: { id: true, email: true, nome: true } } },
      });
    });

    res.status(201).json({
      salao: result,
      credenciais: {
        email: normalizedEmail,
        senha,
        loginUrl: `${process.env.APP_URL || 'http://localhost:5173'}/admin/login`,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'E-mail ou slug ja em uso' });
    throw error;
  }
}

async function updateSalao(req, res) {
  const { id } = req.params;
  const { plano, planoStatus, ativo, nome, notaInterna, slug, maxProfissionais, moduloWhatsapp, moduloIA } = req.body;

  const salao = await prisma.salao.update({
    where: { id },
    data: {
      ...(plano !== undefined && { plano }),
      ...(planoStatus !== undefined && { planoStatus }),
      ...(ativo !== undefined && { ativo }),
      ...(nome !== undefined && { nome }),
      ...(notaInterna !== undefined && { notaInterna }),
      ...(slug !== undefined && { slug }),
      ...(maxProfissionais !== undefined && { maxProfissionais }),
      ...(moduloWhatsapp !== undefined && { moduloWhatsapp }),
      ...(moduloIA !== undefined && { moduloIA }),
    },
  });

  res.json(salao);
}

async function deleteSalao(req, res) {
  const { id } = req.params;
  await prisma.salao.delete({ where: { id } });
  res.json({ ok: true });
}

async function impersonar(req, res) {
  const { id } = req.params;
  const salao = await prisma.salao.findUnique({
    where: { id },
    include: { usuarios: { where: { role: 'admin' }, take: 1 } },
  });

  if (!salao) return res.status(404).json({ error: 'Salao nao encontrado' });
  if (!salao.usuarios[0]) return res.status(400).json({ error: 'Salao sem usuario admin' });

  const usuario = salao.usuarios[0];
  const token = jwt.sign(
    { id: usuario.id, salaoId: salao.id, email: usuario.email, role: usuario.role, impersonado: true },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.cookie('athena_admin_session', token, getCookieOptions(15 * 60 * 1000));
  res.json({ token, salao: { id: salao.id, nome: salao.nome } });
}

async function enviarCredenciais(req, res) {
  const { email, senha, nomeAdmin, nomeSalao } = req.body;

  if (!email || !senha || !nomeSalao) {
    return res.status(400).json({ error: 'Dados insuficientes' });
  }

  try {
    await enviarCredenciaisAcesso({
      destinatario: email,
      nomeAdmin: nomeAdmin || 'Admin',
      nomeSalao,
      email,
      senha,
      loginUrl: process.env.APP_URL,
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function resetSenhaUsuario(req, res) {
  const { usuarioId } = req.params;
  const { novaSenha } = req.body;
  const passwordError = validateStrongPassword(novaSenha);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      senha: await bcrypt.hash(novaSenha, 10),
      passwordUpdatedAt: new Date(),
    },
  });
  res.json({ ok: true });
}

async function exportarCSV(req, res) {
  const saloes = await prisma.salao.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      usuarios: { select: { email: true }, take: 1 },
      _count: { select: { clientes: true, agendamentos: true, profissionais: true } },
    },
  });

  const linhas = [
    ['Nome', 'Slug', 'Plano', 'Status', 'Ativo', 'Admin Email', 'Profissionais', 'Clientes', 'Agendamentos', 'Cadastrado em'].join(';'),
    ...saloes.map((salao) => [
      salao.nome,
      salao.slug,
      salao.plano,
      salao.planoStatus,
      salao.ativo ? 'Sim' : 'Nao',
      salao.usuarios[0]?.email || '',
      salao._count.profissionais,
      salao._count.clientes,
      salao._count.agendamentos,
      new Date(salao.createdAt).toLocaleDateString('pt-BR'),
    ].join(';')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="saloes-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send('\uFEFF' + linhas);
}

async function enviarComunicadoMassa(req, res) {
  const { assunto, mensagem, filtroPlano, filtroStatus } = req.body;

  if (!assunto || !mensagem) {
    return res.status(400).json({ error: 'Assunto e mensagem sao obrigatorios' });
  }

  const where = {};
  if (filtroPlano) where.plano = filtroPlano;
  if (filtroStatus) where.planoStatus = filtroStatus;

  const saloes = await prisma.salao.findMany({
    where,
    include: { usuarios: { select: { email: true }, take: 1 } },
  });

  const destinatarios = saloes.map((salao) => salao.usuarios[0]?.email).filter(Boolean);

  try {
    const resultado = await enviarComunicado({ destinatarios, assunto, mensagem });
    res.json({ ok: true, total: destinatarios.length, ...resultado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getMetricas(req, res) {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const quatorzeDiasAtras = new Date(agora.getTime() - 14 * 86400000);

  const [
    totalSaloes,
    saloesPorPlano,
    saloesPorStatus,
    totalAgendamentos,
    totalClientes,
    novosEsseMes,
    trialExpirado,
    billingSettings,
  ] = await Promise.all([
    prisma.salao.count(),
    prisma.salao.groupBy({ by: ['plano'], _count: { id: true } }),
    prisma.salao.groupBy({ by: ['planoStatus'], _count: { id: true } }),
    prisma.agendamento.count(),
    prisma.cliente.count(),
    prisma.salao.count({ where: { createdAt: { gte: inicioMes } } }),
    prisma.salao.count({ where: { planoStatus: 'trial', createdAt: { lte: quatorzeDiasAtras } } }),
    prisma.billingSettings.findFirst({ orderBy: { createdAt: 'asc' } }),
  ]);

  const mrrPorPlano = getPlanPrices(billingSettings);
  const porPlanoMap = Object.fromEntries(saloesPorPlano.map((item) => [item.plano, item._count.id]));
  const mrr = Object.entries(porPlanoMap).reduce(
    (acc, [plano, count]) => acc + (mrrPorPlano[plano] || 0) * count,
    0
  );

  res.json({
    totalSaloes,
    saloesPorPlano: porPlanoMap,
    saloesPorStatus: Object.fromEntries(saloesPorStatus.map((item) => [item.planoStatus, item._count.id])),
    totalAgendamentos,
    totalClientes,
    novosEsseMes,
    mrrEstimado: mrr,
    planPrices: mrrPorPlano,
    trialExpirado,
  });
}

async function criarSuperAdmin(email, senha, nome = 'Super Admin') {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existe = await prisma.superAdmin.findUnique({ where: { email: normalizedEmail } });
  if (existe) return;

  const hash = await bcrypt.hash(senha, 10);
  await prisma.superAdmin.create({ data: { email: normalizedEmail, senha: hash, nome } });
  console.log(`[SuperAdmin] Conta criada: ${normalizedEmail}`);
}

module.exports = {
  login,
  authenticate,
  getSession,
  logout,
  listarSaloes,
  getSalao,
  criarSalao,
  updateSalao,
  deleteSalao,
  impersonar,
  enviarCredenciais,
  resetSenhaUsuario,
  exportarCSV,
  enviarComunicadoMassa,
  getMetricas,
  criarSuperAdmin,
};
