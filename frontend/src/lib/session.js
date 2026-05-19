const ADMIN_SESSION_KEY = 'athena_admin_session_active';
const SUPERADMIN_SESSION_KEY = 'athena_superadmin_session_active';

export function setAdminSession(data = {}) {
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  localStorage.setItem('salao_admin_token', data.token || '');
  localStorage.setItem('salao_token_expires_at', String(data.expiresAt || ''));
  localStorage.setItem('salao_user_id', data.userId || '');
  localStorage.setItem('salao_user_role', data.role || '');
  localStorage.setItem('salao_user_pid', data.profissionalId || '');
  localStorage.setItem('salao_user_permissions', JSON.stringify(data.permissions || []));
  localStorage.setItem('salao_user_action_permissions', JSON.stringify(data.actionPermissions || []));
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem('salao_admin_token');
  localStorage.removeItem('salao_token_expires_at');
  localStorage.removeItem('salao_user_id');
  localStorage.removeItem('salao_user_role');
  localStorage.removeItem('salao_user_pid');
  localStorage.removeItem('salao_user_permissions');
  localStorage.removeItem('salao_user_action_permissions');
  localStorage.removeItem('salao_data');
}

export function hasAdminSession() {
  if (localStorage.getItem(ADMIN_SESSION_KEY) !== 'true') return false;

  const expiresAt = Number(localStorage.getItem('salao_token_expires_at') || 0);
  if (expiresAt && expiresAt <= Date.now()) {
    clearAdminSession();
    return false;
  }

  return true;
}

export function setSuperAdminSession(data = {}) {
  localStorage.setItem(SUPERADMIN_SESSION_KEY, 'true');
  localStorage.setItem('sa_nome', data.nome || 'Super Admin');
  localStorage.setItem('sa_expires_at', String(data.expiresAt || ''));
}

export function clearSuperAdminSession() {
  localStorage.removeItem(SUPERADMIN_SESSION_KEY);
  localStorage.removeItem('sa_nome');
  localStorage.removeItem('sa_expires_at');
}

export function hasSuperAdminSession() {
  if (localStorage.getItem(SUPERADMIN_SESSION_KEY) !== 'true') return false;

  const expiresAt = Number(localStorage.getItem('sa_expires_at') || 0);
  if (expiresAt && expiresAt <= Date.now()) {
    clearSuperAdminSession();
    return false;
  }

  return true;
}
