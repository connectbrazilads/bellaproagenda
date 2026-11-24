import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import { clearSuperAdminSession } from '../../lib/session';
import { logoutSuperAdmin } from '../../services/api';
import LandingBrandLogo from '../../components/LandingBrandLogo';

const NAV = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/saloes', label: 'Salões', icon: Building2 },
  { to: '/superadmin/billing', label: 'Billing', icon: CreditCard },
  { to: '/superadmin/suporte', label: 'Suporte', icon: LifeBuoy },
  { to: '/superadmin/saude', label: 'Saúde da base', icon: HeartPulse },
  { to: '/superadmin/comunicacao', label: 'Comunicação', icon: Megaphone },
  { to: '/superadmin/seguranca', label: 'Segurança', icon: ShieldCheck },
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
    <div className="flex min-h-screen flex-col bg-[#FAF7F5] text-[#23141C] md:flex-row">
      <aside className="flex flex-col border-b border-[#EAE1E4] bg-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="border-b border-[#EFE7EA] px-5 py-5">
          <LandingBrandLogo variant="lightBg" size="sm" />
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">
            Cockpit SaaS
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-1.5 p-3 md:flex md:flex-1 md:flex-col md:space-y-1 md:overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#23141C] text-white shadow-sm'
                      : 'text-[#6B5761] hover:bg-[#FAF7F5] hover:text-[#23141C]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-2.5 border-t border-[#EFE7EA] p-4">
          <div className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8E7682]">Logado como</p>
            <p className="mt-1 truncate text-sm font-bold text-[#23141C]">{nome}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#EAE1E4] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#6B5761] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 md:justify-start"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
