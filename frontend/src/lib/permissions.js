export const ALL_PERMISSIONS = [
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

export const ALL_ACTION_PERMISSIONS = [
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

export const DEFAULT_ROLE_PERMISSIONS = {
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
    'remuneracao',
  ],
};

export const DEFAULT_ROLE_ACTION_PERMISSIONS = {
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

export const PERMISSION_LABELS = {
  dashboard: 'Dashboard',
  agenda: 'Atendimento',
  inbox: 'Inbox',
  clientes: 'Clientes',
  profissionais: 'Profissionais',
  servicos: 'Servicos',
  pacotes: 'Pacotes',
  produtos: 'Estoque',
  base_conhecimento: 'Base IA',
  fidelidade: 'Fidelidade',
  agendamentos: 'Agendamentos',
  financeiro: 'Financeiro',
  remuneracao: 'Remuneracao',
  relatorio: 'Analise',
  bloqueios: 'Bloqueios',
  notificacoes: 'Mensagens',
  migracao: 'Migracao',
  configuracoes: 'Configuracoes',
  faturas: 'Faturas',
  suporte: 'Suporte',
};

export const ACTION_PERMISSION_LABELS = {
  'agenda.criar': 'Criar atendimentos',
  'agenda.editar': 'Editar atendimentos',
  'agenda.excluir': 'Excluir atendimentos',
  'agenda.pagamento': 'Alterar pagamentos',
  'profissionais.criar': 'Criar profissionais',
  'profissionais.editar': 'Editar profissionais',
  'profissionais.excluir': 'Excluir profissionais',
  'financeiro.caixa.abrir': 'Abrir caixa',
  'financeiro.caixa.movimentar': 'Registrar sangria ou suprimento',
  'financeiro.caixa.fechar': 'Fechar caixa',
  'configuracoes.usuarios.criar': 'Criar logins',
  'configuracoes.usuarios.editar': 'Editar logins',
  'configuracoes.usuarios.excluir': 'Excluir logins',
  'configuracoes.auditoria.ver': 'Ver auditoria',
  'relatorio.fechamento_diario.ver': 'Ver fechamento diario',
  'seguranca.backup.exportar': 'Exportar backup',
};

export function getEffectivePermissions(role, permissions = []) {
  if (role === 'admin' || role === 'gestor') {
    return [...ALL_PERMISSIONS];
  }

  if (Array.isArray(permissions) && permissions.length > 0) {
    return [...new Set(permissions.filter((permission) => ALL_PERMISSIONS.includes(permission)))];
  }

  return [...(DEFAULT_ROLE_PERMISSIONS[role] || [])];
}

export function getEffectiveActionPermissions(role, actionPermissions = []) {
  if (role === 'admin' || role === 'gestor') {
    return [...ALL_ACTION_PERMISSIONS];
  }

  if (Array.isArray(actionPermissions) && actionPermissions.length > 0) {
    return [...new Set(actionPermissions.filter((permission) => ALL_ACTION_PERMISSIONS.includes(permission)))];
  }

  return [...(DEFAULT_ROLE_ACTION_PERMISSIONS[role] || [])];
}

export function readStoredPermissions() {
  try {
    const raw = localStorage.getItem('salao_user_permissions');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredActionPermissions() {
  try {
    const raw = localStorage.getItem('salao_user_action_permissions');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
