import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSuperAdminSession } from '../../lib/session';
import { logoutSuperAdmin } from '../../services/api';
import BrandLogo from '../../components/BrandLogo';

const NAV = [
  { to: '/superadmin', label: 'Dashboard', icon: 'DB', end: true },
  { to: '/superadmin/billing', label: 'Billing', icon: 'BL' },
  { to: '/superadmin/suporte', label: 'Suporte', icon: 'SP' },
  { to: '/superadmin/saloes', label: 'Saloes', icon: 'SL' },
  { to: '/superadmin/saude', label: 'Saude', icon: 'SD' },
  { to: '/superadmin/comunicacao', label: 'Comunicacao', icon: 'CM' },
  { to: '/superadmin/seguranca', label: 'Seguranca', icon: 'SG' },
];

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const nome = localStorage.getItem('sa_nome') || 'Super Admin';

  async function logout() {
    try {
      await logoutSuperAdmin();
    } catch {
      // Mantem o logout local resiliente.
    }

    clearSuperAdminSession();
    navigate('/superadmin/login');
  }

  return (
    <div className="brand-page-dark flex min-h-screen flex-col md:flex-row">
      <aside className="brand-panel-dark flex flex-col md:w-80 md:rounded-r-[2rem] md:border-r md:border-b-0 border-b border-white/5">
        <div className="border-b border-white/5 p-6">
          <BrandLogo variant="darkBg" />
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.32em] text-[#efb1bb]">Cockpit SaaS</p>
        </div>

        <nav className="grid grid-cols-2 gap-2 px-4 py-5 md:block md:flex-1 md:space-y-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-center gap-3 rounded-[1.1rem] px-4 py-3 text-sm font-semibold transition md:justify-start ${
                  isActive
                    ? 'border border-[#efb1bb33] bg-[#e29ba81a] text-[#f6c8cf]'
                    : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/5 p-4">
          <div className="rounded-[1.2rem] border border-white/6 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/36">Logado como</p>
            <p className="mt-2 truncate text-sm font-bold text-white">{nome}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] px-3 py-3 text-sm text-white/48 transition hover:bg-rose-500/10 hover:text-rose-200 md:justify-start"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
