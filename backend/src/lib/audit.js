const prisma = require('./prisma');

function getRequestMeta(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

async function createAuditLog({
  salaoId,
  usuarioId = null,
  acao,
  entidade,
  entidadeId = null,
  status = 'success',
  severity = 'info',
  mensagem = null,
  contexto = null,
  req = null,
}) {
  if (!salaoId || !acao || !entidade) return null;

  const meta = req ? getRequestMeta(req) : {};

  return prisma.auditLog.create({
    data: {
      salaoId,
      usuarioId,
      acao,
      entidade,
      entidadeId,
      status,
      severity,
      mensagem,
      contexto,
      ip: meta.ip || null,
      userAgent: meta.userAgent || null,
    },
  });
}

module.exports = {
  createAuditLog,
};
