const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { getEffectivePermissions, getEffectiveActionPermissions } = require('../lib/permissions');
const {
  clearCookie,
  generateResetToken,
  getCookieOptions,
  getCookieValue,
  validateStrongPassword,
} = require('../lib/security');
const { createAuditLog } = require('../lib/audit');
const { enviarRecuperacaoSenha } = require('../services/emailService');

const ADMIN_COOKIE_NAME = 'athena_admin_session';
const ADMIN_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function buildAdminPayload(user) {
  return {
    id: user.id,
    salaoId: user.salaoId,
    email: user.email,
    role: user.role,
    profissionalId: user.profissionalId,
    permissions: getEffectivePermissions(user.role, user.permissions),
    actionPermissions: getEffectiveActionPermissions(user.role, user.actionPermissions),
  };
}

function issueAdminSession(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  const decoded = jwt.decode(token);
  res.cookie(ADMIN_COOKIE_NAME, token, getCookieOptions(ADMIN_SESSION_MAX_AGE_MS));
  return { token, decoded };
}

function getAdminTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }

  return getCookieValue(req, ADMIN_COOKIE_NAME);
}

async function loadCurrentAdminPayload(tokenPayload) {
  if (!tokenPayload?.id) return null;

  const user = await prisma.usuario.findUnique({
    where: { id: tokenPayload.id },
    select: {
      id: true,
      salaoId: true,
      email: true,
      role: true,
      profissionalId: true,
      permissions: true,
      actionPermissions: true,
      passwordUpdatedAt: true,
    },
  });

  if (!user) return null;

  const tokenIssuedAt = tokenPayload.iat ? tokenPayload.iat * 1000 : null;
  if (tokenIssuedAt && user.passwordUpdatedAt && user.passwordUpdatedAt.getTime() > tokenIssuedAt) {
    return null;
  }

  return buildAdminPayload(user);
}

async function signup(req, res) {
  const { nome, email, senha, salaoNome, slug } = req.body;

  try {
    const passwordError = validateStrongPassword(senha);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hash = await bcrypt.hash(senha, 10);
    const result = await prisma.$transaction(async (tx) => {
      return tx.salao.create({
        data: {
          nome: salaoNome,
          slug: slug.toLowerCase(),
          usuarios: {
            create: {
              nome,
              email: normalizedEmail,
              senha: hash,
              role: 'admin',
            },
          },
        },
        include: { usuarios: true },
      });
    });

    const user = result.usuarios[0];
    const payload = buildAdminPayload({
      ...user,
      salaoId: result.id,
    });
    const { token, decoded } = issueAdminSession(res, payload);

    res.status(201).json({
      token,
      expiresAt: decoded?.exp ? decoded.exp * 1000 : null,
      salao: result,
      user: payload,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'E-mail ou URL do salao ja em uso' });
    }

    res.status(500).json({ error: 'Erro ao criar conta' });
  }
}

async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatorios' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.usuario.findUnique({
    where: { email: normalizedEmail },
    include: { salao: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  const ok = await bcrypt.compare(senha, user.senha);
  if (!ok) {
    await createAuditLog({
      salaoId: user.salaoId,
      usuarioId: user.id,
      acao: 'auth.login',
      entidade: 'usuario',
      entidadeId: user.id,
      status: 'failed',
      severity: 'warning',
      mensagem: 'Tentativa de login com senha invalida',
      contexto: { email: normalizedEmail },
      req,
    });
    return res.status(401).json({ error: 'Credenciais invalidas' });
  }

  const payload = buildAdminPayload(user);
  const { token, decoded } = issueAdminSession(res, payload);

  await createAuditLog({
    salaoId: user.salaoId,
    usuarioId: user.id,
    acao: 'auth.login',
    entidade: 'usuario',
    entidadeId: user.id,
    status: 'success',
    severity: 'info',
    mensagem: 'Login realizado com sucesso',
    contexto: { role: user.role },
    req,
  });

  res.json({
    token,
    expiresAt: decoded?.exp ? decoded.exp * 1000 : null,
    email: user.email,
    role: user.role,
    profissionalId: user.profissionalId,
    permissions: payload.permissions,
    actionPermissions: payload.actionPermissions,
    salao: user.salao,
    user: payload,
  });
}

async function requestPasswordReset(req, res) {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Informe o e-mail de acesso' });
  }

  const user = await prisma.usuario.findUnique({
    where: { email: normalizedEmail },
    include: { salao: true },
  });

  if (!user) {
    return res.json({ ok: true });
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      usuarioId: user.id,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const rawToken = generateResetToken();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      usuarioId: user.id,
      token: tokenHash,
      expiresAt,
    },
  });

  const baseUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/admin/login?resetToken=${rawToken}`;

  try {
    await enviarRecuperacaoSenha({
      destinatario: user.email,
      nome: user.nome || user.email,
      resetUrl,
    });
  } catch (error) {
    console.error('Erro ao enviar recuperacao de senha:', error.message);
  }

  await createAuditLog({
    salaoId: user.salaoId,
    usuarioId: user.id,
    acao: 'auth.password_reset.request',
    entidade: 'usuario',
    entidadeId: user.id,
    status: 'success',
    severity: 'info',
    mensagem: 'Solicitacao de redefinicao de senha',
    contexto: { email: user.email },
    req,
  });

  return res.json({ ok: true });
}

async function resetPassword(req, res) {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) {
    return res.status(400).json({ error: 'Token e nova senha sao obrigatorios' });
  }

  const passwordError = validateStrongPassword(novaSenha);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: tokenHash },
    include: {
      usuario: true,
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Link de recuperacao invalido ou expirado' });
  }

  const hash = await bcrypt.hash(novaSenha, 10);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: resetToken.usuarioId },
      data: {
        senha: hash,
        passwordUpdatedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  clearCookie(res, ADMIN_COOKIE_NAME);

  await createAuditLog({
    salaoId: resetToken.usuario.salaoId,
    usuarioId: resetToken.usuarioId,
    acao: 'auth.password_reset.complete',
    entidade: 'usuario',
    entidadeId: resetToken.usuarioId,
    status: 'success',
    severity: 'info',
    mensagem: 'Senha redefinida por recuperacao',
    req,
  });

  return res.json({ ok: true });
}

async function authenticate(req, res, next) {
  const token = getAdminTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Nao autorizado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const currentPayload = await loadCurrentAdminPayload(payload);
    if (!currentPayload) {
      clearCookie(res, ADMIN_COOKIE_NAME);
      return res.status(401).json({ error: 'Sessao expirada' });
    }

    req.user = { ...payload, ...currentPayload };
    next();
  } catch {
    clearCookie(res, ADMIN_COOKIE_NAME);
    res.status(401).json({ error: 'Token invalido' });
  }
}

async function getSession(req, res) {
  const token = getAdminTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Sessao indisponivel' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const currentPayload = await loadCurrentAdminPayload(payload);
    if (!currentPayload) {
      clearCookie(res, ADMIN_COOKIE_NAME);
      return res.status(401).json({ error: 'Sessao expirada' });
    }

    res.json({
      ok: true,
      user: currentPayload,
      expiresAt: payload.exp ? payload.exp * 1000 : null,
    });
  } catch {
    clearCookie(res, ADMIN_COOKIE_NAME);
    res.status(401).json({ error: 'Sessao expirada' });
  }
}

function logout(req, res) {
  clearCookie(res, ADMIN_COOKIE_NAME);
  res.json({ ok: true });
}

module.exports = {
  ADMIN_COOKIE_NAME,
  login,
  signup,
  authenticate,
  getSession,
  logout,
  requestPasswordReset,
  resetPassword,
};
