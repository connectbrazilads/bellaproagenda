const ALL_PERMISSIONS = [
  'dashboard',
  'agenda',
  'inbox',
  'clientes',
  'profissionais',
  'servicos',
  'pacotes',
  'produtos',
  'base_conhecimento',
  'fidelidade',
  'agendamentos',
  'financeiro',
  'remuneracao',
  'relatorio',
  'bloqueios',
  'notificacoes',
  'migracao',
  'configuracoes',
  'faturas',
  'suporte',
];

const ALL_ACTION_PERMISSIONS = [
  'agenda.criar',
  'agenda.editar',
  'agenda.excluir',
  'agenda.pagamento',
  'profissionais.criar',
  'profissionais.editar',
  'profissionais.excluir',
  'financeiro.caixa.abrir',
  'financeiro.caixa.movimentar',
  'financeiro.caixa.fechar',
  'configuracoes.usuarios.criar',
  'configuracoes.usuarios.editar',
  'configuracoes.usuarios.excluir',
  'configuracoes.auditoria.ver',
  'relatorio.fechamento_diario.ver',
  'seguranca.backup.exportar',
];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  gestor: ALL_PERMISSIONS,
  recepcao: [
    'dashboard',
    'agenda',
    'inbox',
    'clientes',
    'profissionais',
    'servicos',
    'pacotes',
    'produtos',
    'base_conhecimento',
    'fidelidade',
    'agendamentos',
    'bloqueios',
    'notificacoes',
    'faturas',
    'suporte',
  ],
  profissional: [
    'dashboard',
    'agenda',
    'servicos',
    'remuneracao',
  ],
};

const DEFAULT_ROLE_ACTION_PERMISSIONS = {
  admin: ALL_ACTION_PERMISSIONS,
  gestor: ALL_ACTION_PERMISSIONS,
  recepcao: [
    'agenda.criar',
    'agenda.editar',
    'agenda.pagamento',
    'financeiro.caixa.abrir',
    'financeiro.caixa.movimentar',
    'financeiro.caixa.fechar',
    'relatorio.fechamento_diario.ver',
  ],
  profissional: [
    'agenda.editar',
    'agenda.pagamento',
    'relatorio.fechamento_diario.ver',
  ],
};

function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.filter((permission) => ALL_PERMISSIONS.includes(permission)))];
}

function sanitizeActionPermissions(actionPermissions) {
  if (!Array.isArray(actionPermissions)) return [];
  return [...new Set(actionPermissions.filter((permission) => ALL_ACTION_PERMISSIONS.includes(permission)))];
}

function getEffectivePermissions(role, permissions = []) {
  if (role === 'admin' || role === 'gestor') {
    return [...ALL_PERMISSIONS];
  }

  const sanitized = sanitizePermissions(permissions);
  if (role === 'profissional' && !sanitized.includes('servicos')) {
    sanitized.push('servicos');
  }
  if (sanitized.length > 0) {
    return sanitized;
  }

  return [...(DEFAULT_ROLE_PERMISSIONS[role] || [])];
}

function getEffectiveActionPermissions(role, actionPermissions = []) {
  if (role === 'admin' || role === 'gestor') {
    return [...ALL_ACTION_PERMISSIONS];
  }

  const sanitized = sanitizeActionPermissions(actionPermissions);
  if (sanitized.length > 0) {
    return sanitized;
  }

  return [...(DEFAULT_ROLE_ACTION_PERMISSIONS[role] || [])];
}

function hasPermission(user, permission) {
  return getEffectivePermissions(user?.role, user?.permissions).includes(permission);
}

function hasActionPermission(user, permission) {
  return getEffectiveActionPermissions(user?.role, user?.actionPermissions).includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (hasPermission(req.user, permission)) {
      return next();
    }

    return res.status(403).json({ error: 'Acesso negado' });
  };
}

function requireAnyPermission(permissions) {
  return (req, res, next) => {
    const allowed = permissions.some((permission) => hasPermission(req.user, permission));
    if (allowed) {
      return next();
    }

    return res.status(403).json({ error: 'Acesso negado' });
  };
}

function requireActionPermission(permission) {
  return (req, res, next) => {
    if (hasActionPermission(req.user, permission)) {
      return next();
    }

    return res.status(403).json({ error: 'Acao nao permitida para este login' });
  };
}

function requireAnyActionPermission(permissions) {
  return (req, res, next) => {
    const allowed = permissions.some((permission) => hasActionPermission(req.user, permission));
    if (allowed) {
      return next();
    }

    return res.status(403).json({ error: 'Acao nao permitida para este login' });
  };
}

module.exports = {
  ALL_PERMISSIONS,
  ALL_ACTION_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLE_ACTION_PERMISSIONS,
  sanitizePermissions,
  sanitizeActionPermissions,
  getEffectivePermissions,
  getEffectiveActionPermissions,
  hasPermission,
  hasActionPermission,
  requirePermission,
  requireAnyPermission,
  requireActionPermission,
  requireAnyActionPermission,
};
