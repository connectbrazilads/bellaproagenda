import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  Bell,
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
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import { getEffectivePermissions, getEffectiveActionPermissions, readStoredPermissions, readStoredActionPermissions } from '../../lib/permissions';
import ModalPDV from '../../components/ModalPDV';
import { clearAdminSession } from '../../lib/session';
import { getAlertasAgendamento, logoutAdmin, markAlertaAgendamentoLido, markTodosAlertasAgendamentoLidos } from '../../services/api';
import BrandLogo from '../../components/BrandLogo';
import toast from 'react-hot-toast';

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

const CAIXA_ACTION_PERMISSIONS = [
  'financeiro.caixa.abrir',
  'financeiro.caixa.movimentar',
  'financeiro.caixa.fechar',
];

function formatAlertaData(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function getAlertaAgendaDestino(alerta) {
  const data = alerta?.contexto?.data;
  const agendamentoId = alerta?.agendamentoId;
  const params = new URLSearchParams();

  if (data) params.set('data', String(data));
  if (agendamentoId) params.set('agendamento', String(agendamentoId));

  const query = params.toString();
  return `/admin/agenda${query ? `?${query}` : ''}`;
}

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("AdminErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Ops! Algo deu errado.</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">Nao foi possivel carregar esta tela. Tente recarregar a pagina ou voltar para o inicio.</p>
          <button onClick={() => window.location.href = '/admin'} className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg">Voltar ao Inicio</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [alertasUnread, setAlertasUnread] = useState(0);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const isSubPage = location.pathname !== '/admin' && location.pathname !== '/admin/';
  const knownAlertasRef = useRef(new Set());
  const alertasHydratedRef = useRef(false);

  const role = localStorage.getItem('salao_user_role') || 'gestor';
  const pid = localStorage.getItem('salao_user_pid');
  const userId = localStorage.getItem('salao_user_id') || '';
  const userPermissions = getEffectivePermissions(role, readStoredPermissions());
  const userActionPermissions = getEffectiveActionPermissions(role, readStoredActionPermissions());
  const podeVerAlertas = ['agenda', 'dashboard', 'agendamentos'].some((permission) => userPermissions.includes(permission));
  const shouldForceCollapse = viewportWidth < 1440;
  const effectiveCollapsed = collapsed || shouldForceCollapse;
  const canToggleSidebar = viewportWidth >= 1440;

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (viewportWidth >= 1024) {
      setMenuOpen(false);
    }
  }, [viewportWidth]);

  useEffect(() => {
    setMenuOpen(false);
    setAlertasOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (menuOpen || alertasOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [menuOpen, alertasOpen]);

  useEffect(() => {
    if (!menuOpen && !alertasOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setAlertasOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, alertasOpen]);

  useEffect(() => {
    if (!podeVerAlertas) return undefined;

    carregarAlertas();
    const intervalId = window.setInterval(() => {
      carregarAlertas({ silent: true });
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [podeVerAlertas]);

  useEffect(() => {
    function handleOpenAlertasEvent() {
      if (!podeVerAlertas) return;
      setAlertasOpen(true);
      carregarAlertas({ silent: true });
    }

    window.addEventListener('admin:open-notifications', handleOpenAlertasEvent);
    return () => window.removeEventListener('admin:open-notifications', handleOpenAlertasEvent);
  }, [podeVerAlertas]);

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
    }, 300);
  }

  function canAccessPath(path) {
    if (path === '/admin/financeiro') {
      return userPermissions.includes('financeiro')
        || CAIXA_ACTION_PERMISSIONS.some((permission) => userActionPermissions.includes(permission));
    }

    const permission = PATH_PERMISSIONS[path];
    if (!permission) return true;
    return userPermissions.includes(permission);
  }

  function isItemActive(item) {
    if (item.end) {
      return location.pathname === item.to;
    }

    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  }

  async function carregarAlertas({ silent = false } = {}) {
    if (!podeVerAlertas) return;

    if (!silent) setLoadingAlertas(true);
    try {
      const response = await getAlertasAgendamento({ limit: 40 });
      const items = response.data?.items || [];
      const unreadCount = Number(response.data?.unreadCount || 0);

      setAlertas(items);
      setAlertasUnread(unreadCount);

      const novosIds = items
        .filter((item) => !knownAlertasRef.current.has(item.id))
        .map((item) => item.id);

      if (alertasHydratedRef.current && novosIds.length > 0) {
        items
          .filter((item) => novosIds.includes(item.id))
          .slice(0, 3)
          .forEach((item) => toast.success(item.titulo || 'Novo agendamento recebido.'));
      }

      knownAlertasRef.current = new Set(items.map((item) => item.id));
      alertasHydratedRef.current = true;
    } catch {
      if (!silent) {
        toast.error('Nao foi possivel carregar as notificacoes.');
      }
    } finally {
      if (!silent) setLoadingAlertas(false);
    }
  }

  async function handleOpenAlerta(alerta) {
    if (!alerta) return;

    const jaLida = Array.isArray(alerta.lidaPorUserIds) && alerta.lidaPorUserIds.includes(userId);
    if (!jaLida) {
      try {
        await markAlertaAgendamentoLido(alerta.id);
      } catch {
        // Keep navigation resilient even if read state fails.
      }
    }

    setAlertasOpen(false);
    navigate(getAlertaAgendaDestino(alerta));
    carregarAlertas({ silent: true });
  }

  async function handleMarcarTodasLidas() {
    try {
      await markTodosAlertasAgendamentoLidos();
      carregarAlertas({ silent: true });
    } catch {
      toast.error('Nao foi possivel marcar as notificacoes como lidas.');
    }
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
      return canAccessPath(item.to);
    });

    return { ...group, items: visibleItems };
  }).filter((group) => group.items.length > 0);

  useEffect(() => {
    if (canAccessPath(location.pathname)) return;

    const fallbackRoute = visibleGroups[0]?.items?.[0]?.to || '/admin';
    if (fallbackRoute !== location.pathname) {
      navigate(fallbackRoute, { replace: true });
    }
  }, [location.pathname, navigate, userPermissions, userActionPermissions, visibleGroups]);

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
    <div className="admin-panel flex min-h-screen md:h-screen font-sans overflow-x-hidden md:overflow-hidden bg-[#0a0a0c] text-[#f4ecd8]" style={{ '--admin-mobile-header-height': '73px' }}>
      {/* Sidebar — desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col transition-all duration-500 ease-in-out relative group/sidebar",
        effectiveCollapsed ? "w-24" : "w-72",
        "bg-[#120e11]/80 backdrop-blur-3xl border-r border-[#d4af37]/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
      )}>
        {/* Toggle Button */}
        <div className={cn("absolute -right-4 top-24 z-50", !canToggleSidebar && "hidden")}>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-[#1a1518] border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 hover:border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)] scale-100 active:scale-90"
            title={effectiveCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <motion.div
              animate={{ rotate: effectiveCollapsed ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ChevronLeft size={16} />
            </motion.div>
          </button>
        </div>

        <div className={cn("p-4 md:p-6 xl:p-8", effectiveCollapsed && "px-4 flex justify-center")}>
          <div className={cn("flex items-center justify-between", effectiveCollapsed ? "flex-col gap-4 sm:p-6" : "mb-2")}>
            <div className={cn("flex items-center gap-3", effectiveCollapsed && "flex-col")}>
              {effectiveCollapsed ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                  <span className="font-brand-display text-2xl font-black leading-none">B</span>
                </div>
              ) : (
                <BrandLogo compact variant="darkBg" />
              )}
            </div>
            <div className={cn("flex items-center gap-2", effectiveCollapsed && "flex-col")}>
              {podeVerAlertas && (
                <button
                  onClick={() => {
                    setAlertasOpen(true);
                    carregarAlertas({ silent: true });
                  }}
                  className="relative p-2 rounded-xl transition-all hover:scale-110 active:scale-90 bg-white/5 text-[#b299a0] hover:text-[#d4af37] hover:bg-[#d4af37]/10"
                  title="Central de notificacoes"
                >
                  <Bell className="w-4 h-4" />
                  {alertasUnread > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#d4af37] px-1.5 py-0.5 text-[9px] font-black leading-none text-black">
                      {alertasUnread > 9 ? '9+' : alertasUnread}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar pb-10">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {!effectiveCollapsed && (
                <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={effectiveCollapsed ? item.label : ""}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-2xl transition-all duration-300 group relative",
                        effectiveCollapsed ? "justify-center p-4" : "gap-4 px-5 py-3.5",
                        isActive
                            ? "bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.1)] translate-x-1"
                            : "text-[#b299a0] hover:text-[#f4ecd8] hover:bg-white/5 hover:translate-x-1"
                      )
                    }
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", "transition-transform group-hover:scale-110")} />
                    {!effectiveCollapsed && (
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

        <div className="p-4 sm:p-6 border-t border-[#d4af37]/10">
          <button
            onClick={logout}
            title={effectiveCollapsed ? "Encerrar Sessao" : ""}
            className={cn(
              "w-full flex items-center transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6c74] hover:text-rose-400 hover:bg-rose-400/10",
              effectiveCollapsed ? "justify-center p-4" : "gap-3 px-5 py-4"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!effectiveCollapsed && <span>Encerrar Sessao</span>}
          </button>
        </div>
      </aside>

      {/* Topbar — mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[70] flex items-center justify-between px-4 py-4 sm:px-6 border-b bg-[#120e11]/90 backdrop-blur-2xl border-[#d4af37]/10 shadow-lg">
        <div className="flex items-center gap-3">
          {isSubPage && (
            <button 
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl mr-1 transition-all bg-white/5 text-[#b299a0] hover:text-[#d4af37]"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <BrandLogo compact variant="darkBg" imageClassName="w-[148px]" />
        </div>
        <div className="flex items-center gap-4">
          {podeVerAlertas && (
            <button
              onClick={() => {
                setAlertasOpen(true);
                carregarAlertas({ silent: true });
              }}
              className="relative text-[#b299a0] hover:text-[#d4af37] transition-colors"
              aria-label="Abrir notificacoes"
            >
              <Bell className="w-5 h-5" />
              {alertasUnread > 0 && (
                <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-[#d4af37] px-1.5 py-0.5 text-[9px] font-black leading-none text-black">
                  {alertasUnread > 9 ? '9+' : alertasUnread}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            className="text-[#f4ecd8]"
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
            className="lg:hidden fixed inset-0 bg-black/60 z-[75] backdrop-blur-sm" 
            onClick={closeMobileMenu}
          >
            <motion.div 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-72 h-full shadow-2xl overflow-y-auto overscroll-contain px-4 py-8 z-[80] bg-[#120e11]/95 backdrop-blur-3xl border-r border-[#d4af37]/10" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-10 px-4">
                 <BrandLogo variant="darkBg" />
              </div>
              <nav className="space-y-8">
                {visibleGroups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">
                      {group.label}
                    </h3>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => handleMobileNavigate(item.to)}
                          className={cn(
                            "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all text-left",
                            isItemActive(item)
                                ? "bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                : "text-[#b299a0] hover:text-[#f4ecd8] hover:bg-white/5"
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
                className="mt-10 flex items-center gap-4 px-5 py-4 text-[10px] font-black text-rose-500 uppercase tracking-widest w-full hover:bg-rose-500/10 rounded-2xl transition-colors"
              >
                <LogOut className="w-4 h-4" /> Encerrar Sessao
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertasOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[82] bg-black/55 backdrop-blur-sm"
            onClick={() => setAlertasOpen(false)}
          >
            <motion.aside
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="ml-auto flex h-full w-full max-w-md flex-col border-l border-[#d4af37]/20 shadow-2xl bg-[#120e11]/95 backdrop-blur-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[#d4af37]/10 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Central de Alertas</p>
                    <h2 className="mt-2 text-2xl font-brand-display font-black text-[#f4ecd8]">Notificacoes</h2>
                    <p className="mt-1 text-xs text-[#b299a0]">
                      {alertasUnread > 0 ? `${alertasUnread} notificacao(oes) pendente(s).` : 'Tudo em dia por aqui.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setAlertasOpen(false)}
                    className="rounded-2xl p-3 transition-all bg-white/5 text-[#b299a0] hover:text-[#d4af37] hover:bg-[#d4af37]/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    onClick={() => carregarAlertas()}
                    className="rounded-[1rem] border border-[#d4af37]/20 bg-white/5 px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#b299a0] hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-all"
                  >
                    {loadingAlertas ? 'Atualizando...' : 'Atualizar'}
                  </button>
                  <button
                    onClick={handleMarcarTodasLidas}
                    disabled={alertasUnread === 0}
                    className="inline-flex items-center gap-2 rounded-[1rem] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#d4af37]/30"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Marcar lidas
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                {alertas.length === 0 ? (
                  <div className="mt-6 rounded-[2.5rem] border border-dashed border-[#d4af37]/20 bg-black/40 p-8 text-center">
                    <Bell className="mx-auto h-10 w-10 text-[#d4af37]/50" />
                    <p className="mt-4 text-sm font-brand-display font-black text-[#f4ecd8]">Nenhum alerta por enquanto</p>
                    <p className="mt-2 text-[11px] text-[#b299a0]">
                      Novos agendamentos online vao aparecer aqui automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertas.map((alerta) => {
                      const lida = Array.isArray(alerta.lidaPorUserIds) && alerta.lidaPorUserIds.includes(userId);
                      return (
                        <button
                          key={alerta.id}
                          type="button"
                          onClick={() => handleOpenAlerta(alerta)}
                          className={cn(
                            "w-full rounded-[2rem] p-5 text-left transition-all border",
                            lida
                                ? "border-white/5 bg-black/40 text-[#b299a0]"
                                : "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f4ecd8] shadow-[0_0_20px_rgba(212,175,55,0.05)]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!lida && <span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)]" />}
                                <p className={cn("truncate text-[9px] font-black uppercase tracking-[0.2em]", lida ? "text-[#8a6c74]" : "text-[#d4af37]")}>
                                  {alerta.tipo === 'agendamento_online_novo' ? 'Agendamento Online' : 'Alerta'}
                                </p>
                              </div>
                              <p className={cn("mt-3 text-sm font-brand-display font-black", lida ? "text-[#f4ecd8]" : "text-white")}>{alerta.titulo}</p>
                              <p className={cn("mt-2 text-xs leading-relaxed", lida ? "text-[#b299a0]" : "text-[#f4ecd8]")}>{alerta.mensagem}</p>
                            </div>
                            <ChevronRight className={cn("mt-1 h-4 w-4 flex-shrink-0 transition-transform", lida ? "opacity-30" : "text-[#d4af37]")} />
                          </div>
                          <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#8a6c74]">
                            {formatAlertaData(alerta.createdAt)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-[calc(var(--admin-mobile-header-height,73px)+1rem)] md:px-5 md:pb-10 md:pt-6 lg:px-6 lg:pt-7 xl:px-8 xl:pb-12 xl:pt-8 2xl:px-10 2xl:pt-10 custom-scrollbar"
        >
          <AdminErrorBoundary>
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>

      <ModalPDV />
    </div>
  );
}
