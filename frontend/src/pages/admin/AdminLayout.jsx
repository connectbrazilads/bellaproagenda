import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  Brain, 
  User, 
  Scissors, 
  Gift, 
  Users, 
  Ban, 
  Package, 
  Download, 
  DollarSign, 
  FileText,
  Gem, 
  LifeBuoy,
  Smartphone, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Menu,
  X,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { getEffectivePermissions, getEffectiveActionPermissions, readStoredPermissions, readStoredActionPermissions } from '../../lib/permissions';
import ModalPDV from '../../components/ModalPDV';
import { clearAdminSession } from '../../lib/session';
import { logoutAdmin } from '../../services/api';
import BrandLogo from '../../components/BrandLogo';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'dashboard' },
      { to: '/admin/agenda', label: 'Agenda', icon: Calendar, permission: 'agenda' },
      { to: '/admin/inbox', label: 'Inbox', icon: MessageSquare, permission: 'inbox' },
    ],
  },
  {
    label: 'Gestao',
    items: [
      { to: '/admin/clientes', label: 'Clientes', icon: Users, permission: 'clientes' },
      { to: '/admin/profissionais', label: 'Profissionais', icon: User, permission: 'profissionais' },
      { to: '/admin/servicos', label: 'Servicos', icon: Scissors, permission: 'servicos' },
      { to: '/admin/pacotes', label: 'Pacotes', icon: Gift, permission: 'pacotes' },
      { to: '/admin/produtos', label: 'Estoque', icon: Package, permission: 'produtos' },
    ],
  },
  {
    label: 'Inteligencia',
    items: [
      { to: '/admin/base-conhecimento', label: 'Base IA', icon: Brain, permission: 'base_conhecimento' },
      { to: '/admin/fidelidade', label: 'Fidelidade', icon: Gem, permission: 'fidelidade' },
      { to: '/admin/agendamentos', label: 'Agendamentos', icon: ClipboardList, permission: 'agendamentos' },
    ],
  },
  {
    label: 'Configuracoes',
    items: [
      { to: '/admin/financeiro', label: 'Financeiro', icon: DollarSign, permission: 'financeiro' },
      { to: '/admin/faturas', label: 'Faturas', icon: FileText, permission: 'faturas' },
      { to: '/admin/suporte', label: 'Suporte', icon: LifeBuoy, permission: 'suporte' },
      { to: '/admin/remuneracao', label: 'Remuneracao', icon: ClipboardList },
      { to: '/admin/relatorio', label: 'Analise', icon: TrendingUp },
      { to: '/admin/bloqueios', label: 'Bloqueios', icon: Ban, permission: 'bloqueios' },
      { to: '/admin/notificacoes', label: 'Mensagens', icon: Smartphone, permission: 'notificacoes' },
      { to: '/admin/migracao', label: 'Migracao', icon: Download },
      { to: '/admin/configuracoes', label: 'Configuracoes', icon: Settings },
    ],
  },
];

const PATH_PERMISSIONS = {
  '/admin': 'dashboard',
  '/admin/agenda': 'agenda',
  '/admin/inbox': 'inbox',
  '/admin/clientes': 'clientes',
  '/admin/profissionais': 'profissionais',
  '/admin/servicos': 'servicos',
  '/admin/pacotes': 'pacotes',
  '/admin/produtos': 'produtos',
  '/admin/base-conhecimento': 'base_conhecimento',
  '/admin/fidelidade': 'fidelidade',
  '/admin/agendamentos': 'agendamentos',
  '/admin/financeiro': 'financeiro',
  '/admin/faturas': 'faturas',
  '/admin/suporte': 'suporte',
  '/admin/remuneracao': 'remuneracao',
  '/admin/relatorio': 'relatorio',
  '/admin/bloqueios': 'bloqueios',
  '/admin/notificacoes': 'notificacoes',
  '/admin/migracao': 'migracao',
  '/admin/configuracoes': 'configuracoes',
};

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const isSubPage = location.pathname !== '/admin' && location.pathname !== '/admin/';

  const role = localStorage.getItem('salao_user_role') || 'gestor';
  const pid = localStorage.getItem('salao_user_pid');
  const userPermissions = getEffectivePermissions(role, readStoredPermissions());
  const userActionPermissions = getEffectiveActionPermissions(role, readStoredActionPermissions());

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  function handleMobileNavigate(to) {
    setMenuOpen(false);

    if (location.pathname === to) {
      return;
    }

    window.setTimeout(() => {
      navigate(to);
    }, 0);
  }

  function isItemActive(item) {
    if (item.end) {
      return location.pathname === item.to;
    }

    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  }

  async function logout() {
    try {
      await logoutAdmin();
    } catch {
      // Keep local logout resilient even if the cookie is already gone.
    }

    clearAdminSession();
    navigate('/admin/login');
  }

  // Logica de visibilidade por role
  const filteredGroups = NAV_GROUPS.map(group => {
    const filteredItems = group.items.filter(item => {
      // Regras de restricao
      if (role === 'profissional') {
        const allowed = ['Dashboard', 'Agenda', 'Remuneracao'];
        return allowed.includes(item.label);
      }
      if (role === 'recepcao') {
        const forbidden = ['Financeiro', 'Analise', 'Configuracoes', 'Migracao', 'Usuarios'];
        return !forbidden.includes(item.label);
      }
      return true; // gestor/admin ve tudo
    });
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);

  const visibleGroups = NAV_GROUPS.map((group) => {
    const visibleItems = group.items.filter((item) => {
      const permission = item.permission || PATH_PERMISSIONS[item.to];
      if (!permission) return true;
      return userPermissions.includes(permission);
    });

    return { ...group, items: visibleItems };
  }).filter((group) => group.items.length > 0);

  useEffect(() => {
    const currentPermission = PATH_PERMISSIONS[location.pathname];
    if (!currentPermission) return;
    if (userPermissions.includes(currentPermission)) return;

    const fallbackRoute = visibleGroups[0]?.items?.[0]?.to || '/admin';
    if (fallbackRoute !== location.pathname) {
      navigate(fallbackRoute, { replace: true });
    }
  }, [location.pathname, navigate, userPermissions, visibleGroups]);

  useEffect(() => {
    const expiresAt = Number(localStorage.getItem('salao_token_expires_at') || 0);
    if (!expiresAt) return undefined;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      logout();
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className={cn(
      "admin-panel flex min-h-screen md:h-screen font-sans overflow-x-hidden md:overflow-hidden",
      dark ? "bg-[#16151b] text-white" : "bg-[#faf7f6] text-slate-900"
    )} style={{ '--admin-mobile-header-height': '73px' }}>
      {/* Sidebar â€” desktop */}
      <aside className={cn(
        "hidden md:flex flex-col transition-all duration-500 ease-in-out relative group/sidebar",
        collapsed ? "w-24" : "w-72",
        dark ? "bg-slate-900/70 backdrop-blur-xl border-r border-gray-200 dark:border-white/5" : "bg-white/88 backdrop-blur-xl border-r border-slate-200/80 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.22)]"
      )}>
        {/* Toggle Button */}
        <div className="absolute -right-4 top-24 z-50">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300",
              dark 
                ? "bg-slate-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-violet-600 hover:border-violet-500" 
                : "bg-white border-slate-300 text-slate-500 hover:text-violet-700 hover:border-violet-300 shadow-xl shadow-slate-200/70",
              "scale-100 active:scale-90"
            )}
            title={collapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ChevronLeft size={16} />
            </motion.div>
          </button>
        </div>

        <div className={cn("p-4 md:p-8", collapsed && "px-4 flex justify-center")}>
          <div className={cn("flex items-center justify-between", collapsed ? "flex-col gap-4 sm:p-6" : "mb-2")}>
            <div className={cn("flex items-center gap-3", collapsed && "flex-col")}>
              {collapsed ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e7c4c8] bg-[linear-gradient(180deg,#fff8f7_0%,#f9e0dd_100%)] text-[#a45f69] shadow-[0_18px_38px_-22px_rgba(226,155,168,0.9)]">
                  <span className="font-brand-display text-2xl leading-none">B</span>
                </div>
              ) : (
                <BrandLogo compact variant={dark ? 'darkBg' : 'lightBg'} />
              )}
            </div>
            <button
              onClick={toggle}
              className={cn(
                "p-2 rounded-xl transition-all hover:scale-110 active:scale-90",
                dark ? "bg-white/5 text-[#d6b6bc] hover:text-white" : "bg-[#fff2f1] text-[#8c6b75] hover:text-[#c2737f]"
              )}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar pb-10">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {!collapsed && (
                <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-400/80 dark:text-gray-400/30">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : ""}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-2xl transition-all duration-300 group relative",
                        collapsed ? "justify-center p-4" : "gap-4 px-5 py-3",
                        isActive
                            ? dark
                            ? "bg-gradient-to-r from-[#d68c99] to-[#b26a78] text-white shadow-xl shadow-[#d68c9955] translate-x-1"
                            : "bg-[#fff0f1] text-[#b56f7c] ring-1 ring-[#efcbd1] shadow-[0_18px_38px_-28px_rgba(210,133,149,0.55)] translate-x-1"
                          : cn(
                              "hover:translate-x-1",
                              dark ? "text-[#a98690] hover:text-[#faf7f6] hover:bg-white/5" : "text-[#8c6b75] hover:text-[#1a1a1f] hover:bg-[#fff2f1]"
                            )
                      )
                    }
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", "transition-transform group-hover:scale-110")} />
                    {!collapsed && (
                      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-white/5">
          <button
            onClick={logout}
            title={collapsed ? "Encerrar Sessao" : ""}
            className={cn(
              "w-full flex items-center transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]",
              collapsed ? "justify-center p-4" : "gap-3 px-5 py-4",
              dark ? "text-slate-500 hover:text-red-400 hover:bg-red-400/10" : "text-slate-600 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Encerrar Sessao</span>}
          </button>
        </div>
      </aside>

      {/* Topbar â€” mobile */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-[70] flex items-center justify-between px-6 py-4 border-b shadow-sm",
        dark ? "bg-[#17151bdd] backdrop-blur-xl border-gray-200 dark:border-white/5" : "bg-[#fffaf9e6] backdrop-blur-xl border-[#f0dfdc]"
      )}>
        <div className="flex items-center gap-3">
          {isSubPage && (
            <button 
              onClick={() => navigate(-1)}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl mr-1 transition-all",
                dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"
              )}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <BrandLogo compact variant={dark ? 'darkBg' : 'lightBg'} imageClassName="w-[148px]" />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggle} className="text-[#a98690]">{dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            className="text-gray-900 dark:text-white"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 z-[75] backdrop-blur-sm" 
            onClick={closeMobileMenu}
          >
            <motion.div 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "w-72 h-full shadow-2xl overflow-y-auto overscroll-contain px-4 py-8 z-[80]",
                dark ? "bg-slate-900 border-r border-gray-200 dark:border-white/5" : "bg-white/95 backdrop-blur-xl border-r border-slate-200/80"
              )} 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-10 px-4">
                 <BrandLogo variant={dark ? 'darkBg' : 'lightBg'} />
              </div>
              <nav className="space-y-8">
                {visibleGroups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-gray-500/60 dark:text-gray-400/30">
                      {group.label}
                    </h3>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => handleMobileNavigate(item.to)}
                          className={cn(
                            "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-left",
                            isItemActive(item)
                              ? dark
                                ? "bg-gradient-to-r from-[#d68c99] to-[#b26a78] text-white shadow-xl shadow-[#d68c9955]"
                                : "bg-[#fff0f1] text-[#b56f7c] ring-1 ring-[#efcbd1] shadow-[0_18px_38px_-28px_rgba(210,133,149,0.55)]"
                              : dark ? "text-[#d6b6bc]" : "text-[#8c6b75]"
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <button
                onClick={() => {
                  closeMobileMenu();
                  logout();
                }}
                className="mt-10 flex items-center gap-4 px-5 py-4 text-[10px] font-black text-red-500 uppercase tracking-widest w-full"
              >
                <LogOut className="w-4 h-4" /> Encerrar Sessao
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-[calc(var(--admin-mobile-header-height,73px)+1rem)] md:px-6 md:pb-10 md:pt-8 xl:px-12 xl:pb-12 xl:pt-12 custom-scrollbar"
        >
          <Outlet />
        </div>
      </main>

      <ModalPDV />
    </div>
  );
}
