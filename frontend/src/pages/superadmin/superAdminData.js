export const PLAN_PRICES = {
  basic: 99,
  pro: 199,
  enterprise: 499,
};

export const PLAN_LABELS = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const STATUS_LABELS = {
  trial: 'Trial',
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  suspenso: 'Suspenso',
};

const STORAGE_KEYS = {
  campaigns: 'bellapro_superadmin_campaigns',
  audit: 'bellapro_superadmin_audit',
  team: 'bellapro_superadmin_team',
};

const DEFAULT_TEAM = [
  { id: 'owner', nome: 'Owner SaaS', email: 'owner@bellapro.com', role: 'Owner', status: 'Ativo' },
  { id: 'financeiro', nome: 'Financeiro', email: 'financeiro@bellapro.com', role: 'Financeiro', status: 'Ativo' },
  { id: 'suporte', nome: 'Suporte', email: 'suporte@bellapro.com', role: 'Suporte', status: 'Ativo' },
];

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignora falhas de armazenamento local para evitar quebra da interface.
  }
}

function generateLocalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `sa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getCampaignHistory() {
  return safeRead(STORAGE_KEYS.campaigns, []);
}

export function appendCampaignHistory(item) {
  const current = getCampaignHistory();
  const next = [{ id: generateLocalId(), createdAt: new Date().toISOString(), ...item }, ...current].slice(0, 50);
  safeWrite(STORAGE_KEYS.campaigns, next);
  return next;
}

export function getAuditTrail() {
  return safeRead(STORAGE_KEYS.audit, []);
}

export function appendAuditTrail(event) {
  const current = getAuditTrail();
  const next = [{ id: generateLocalId(), createdAt: new Date().toISOString(), ...event }, ...current].slice(0, 200);
  safeWrite(STORAGE_KEYS.audit, next);
  return next;
}

export function getInternalTeam() {
  const team = safeRead(STORAGE_KEYS.team, null);
  if (!team || team.length === 0) {
    safeWrite(STORAGE_KEYS.team, DEFAULT_TEAM);
    return DEFAULT_TEAM;
  }
  return team;
}

export function saveInternalTeam(team) {
  safeWrite(STORAGE_KEYS.team, team);
}

export function buildSuperAdminInsights(saloes = [], metricas = null) {
  const planPrices = {
    ...PLAN_PRICES,
    ...(metricas?.planPrices || {}),
  };
  const total = saloes.length;
  const active = saloes.filter((item) => item.ativo).length;
  const inadimplentes = saloes.filter((item) => item.planoStatus === 'inadimplente').length;
  const trials = saloes.filter((item) => item.planoStatus === 'trial').length;
  const suspensos = saloes.filter((item) => item.planoStatus === 'suspenso').length;
  const arr = (metricas?.mrrEstimado || 0) * 12;
  const arpa = total ? (metricas?.mrrEstimado || 0) / total : 0;
  const healthRows = saloes.map((salao) => {
    const riskScore =
      (salao.planoStatus === 'inadimplente' ? 45 : 0) +
      (salao.alertas?.includes('trial_expirado') ? 25 : 0) +
      (salao.alertas?.includes('inativo') ? 20 : 0) +
      ((5 - (salao.onboardingScore || 0)) * 6);

    const health =
      riskScore >= 55 ? 'critico' :
      riskScore >= 30 ? 'atencao' :
      'saudavel';

    return {
      ...salao,
      riskScore,
      health,
      estimatedMRR: planPrices[salao.plano] || 0,
      adoptionRate: Math.round(((salao.onboardingScore || 0) / 5) * 100),
    };
  });

  const healthyCount = healthRows.filter((item) => item.health === 'saudavel').length;
  const attentionCount = healthRows.filter((item) => item.health === 'atencao').length;
  const criticalCount = healthRows.filter((item) => item.health === 'critico').length;

  const byPlan = ['basic', 'pro', 'enterprise'].map((plan) => ({
    plan,
    label: PLAN_LABELS[plan],
    salons: saloes.filter((item) => item.plano === plan).length,
    price: planPrices[plan] || 0,
    mrr: saloes.filter((item) => item.plano === plan).reduce((sum, item) => sum + (planPrices[item.plano] || 0), 0),
  }));

  return {
    total,
    active,
    inadimplentes,
    trials,
    suspensos,
    arr,
    arpa,
    healthyCount,
    attentionCount,
    criticalCount,
    byPlan,
    healthRows,
  };
}

export function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function healthBadge(health) {
  if (health === 'critico') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (health === 'atencao') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
}
