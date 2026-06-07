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
    <div className={cn(
      "admin-panel flex min-h-screen md:h-screen font-sans overflow-x-hidden md:overflow-hidden",
      dark ? "bg-[#121116] text-white" : "bg-[#faf7f6] text-slate-900"
    )} style={{ '--admin-mobile-header-height': '73px' }}>
      {/* Sidebar — desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col transition-all duration-500 ease-in-out relative group/sidebar",
        effectiveCollapsed ? "w-24" : "w-[290px]",
        dark ? "bg-[#121116]/80 backdrop-blur-3xl border-r border-white/[0.02]" : "bg-[#fcfafa]/80 backdrop-blur-3xl border-r border-black/[0.03] shadow-[0_24px_60px_-32px_rgba(140,107,117,0.06)]"
      )}>
        {/* Toggle Button */}
        <div className={cn("absolute -right-4 top-24 z-50", !canToggleSidebar && "hidden")}>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300",
              dark 
                ? "bg-slate-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-violet-600 hover:border-violet-500" 
                : "bg-white border-slate-300 text-slate-500 hover:text-violet-700 hover:border-violet-300 shadow-xl shadow-slate-200/70",
              "scale-100 active:scale-90"
            )}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e7c4c8] bg-[linear-gradient(180deg,#fff8f7_0%,#f9e0dd_100%)] text-[#a45f69] shadow-[0_18px_38px_-22px_rgba(226,155,168,0.9)]">
                  <span className="font-brand-display text-2xl leading-none">B</span>
                </div>
              ) : (
                <BrandLogo compact variant={dark ? 'darkBg' : 'lightBg'} />
              )}
            </div>
            <div className={cn("flex items-center gap-2", effectiveCollapsed && "flex-col")}>
              {podeVerAlertas && (
                <button
                  onClick={() => {
                    setAlertasOpen(true);
                    carregarAlertas({ silent: true });
                  }}
                  className={cn(
                    "relative p-2 rounded-xl transition-all hover:scale-110 active:scale-90",
                    dark ? "bg-white/5 text-[#d6b6bc] hover:text-white" : "bg-[#fff2f1] text-[#8c6b75] hover:text-[#c2737f]"
                  )}
                  title="Central de notificacoes"
                >
                  <Bell className="w-4 h-4" />
                  {alertasUnread > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#e29ba8] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#1a1a1f] shadow-sm">
                      {alertasUnread > 9 ? '9+' : alertasUnread}
                    </span>
                  )}
                </button>
              )}
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
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar pb-10">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {!effectiveCollapsed && (
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
                    title={effectiveCollapsed ? item.label : ""}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-[1.25rem] transition-all duration-300 group relative",
                        effectiveCollapsed ? "justify-center p-4" : "gap-4 px-5 py-3",
                        isActive
                            ? dark
                            ? "bg-white/10 text-white shadow-lg shadow-black/20 translate-x-1"
                            : "bg-[#fff0f1] text-[#b56f7c] translate-x-1"
                          : cn(
                              "hover:translate-x-1",
                              dark ? "text-[#a98690] hover:text-[#faf7f6] hover:bg-white/[0.02]" : "text-[#8c6b75] hover:text-[#1a1a1f] hover:bg-[#fff2f1]"
                            )
                      )
                    }
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", "transition-transform group-hover:scale-110")} />
                    {!effectiveCollapsed && (
                      <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
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
            title={effectiveCollapsed ? "Encerrar Sessao" : ""}
            className={cn(
              "w-full flex items-center transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]",
              effectiveCollapsed ? "justify-center p-4" : "gap-3 px-5 py-4",
              dark ? "text-slate-500 hover:text-red-400 hover:bg-red-400/10" : "text-slate-600 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!effectiveCollapsed && <span>Encerrar Sessao</span>}
          </button>
        </div>
      </aside>

      {/* Topbar — mobile */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-[70] flex items-center justify-between px-5 py-4 border-b",
        dark ? "bg-[#121116]/90 backdrop-blur-xl border-white/[0.02]" : "bg-white/90 backdrop-blur-xl border-black/[0.02] shadow-[0_4px_30px_rgba(226,155,168,0.02)]"
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
          {podeVerAlertas && (
            <button
              onClick={() => {
                setAlertasOpen(true);
                carregarAlertas({ silent: true });
              }}
              className="relative text-[#a98690]"
              aria-label="Abrir notificacoes"
            >
              <Bell className="w-5 h-5" />
              {alertasUnread > 0 && (
                <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-[#e29ba8] px-1.5 py-0.5 text-[9px] font-black leading-none text-[#1a1a1f]">
                  {alertasUnread > 9 ? '9+' : alertasUnread}
                </span>
              )}
            </button>
          )}
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
            className="lg:hidden fixed inset-0 bg-black/60 z-[75] backdrop-blur-sm" 
            onClick={closeMobileMenu}
          >
            <motion.div 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "w-72 h-full shadow-2xl overflow-y-auto overscroll-contain px-4 py-8 z-[80]",
                dark ? "bg-slate-950/95 backdrop-blur-2xl border-r border-white/5" : "bg-white/95 backdrop-blur-2xl border-r border-[#edd7d4]"
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
                            "w-full flex items-center gap-4 px-5 py-4 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all text-left",
                            isItemActive(item)
                              ? dark
                                ? "bg-white/10 text-white shadow-lg"
                                : "bg-[#fff0f1] text-[#b56f7c]"
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
              className={cn(
                "ml-auto flex h-full w-full max-w-md flex-col border-l shadow-2xl",
                dark ? "bg-[#121116]/95 backdrop-blur-3xl border-white/[0.03]" : "bg-white/95 backdrop-blur-3xl border-black/[0.03]"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-5 py-5 dark:border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#e29ba8]">Central de alertas</p>
                    <h2 className="mt-2 text-2xl font-brand-display text-gray-900 dark:text-white">Agendamentos</h2>
                    <p className="mt-2 text-sm text-[#8c6b75] dark:text-white/55">
                      {alertasUnread > 0 ? `${alertasUnread} notificacao(oes) sem leitura.` : 'Tudo em dia por aqui.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setAlertasOpen(false)}
                    className={cn(
                      "rounded-2xl p-3 transition-all",
                      dark ? "bg-white/5 text-white/60 hover:text-white" : "bg-[#fff0f1] text-[#8c6b75] hover:text-[#1a1a1f]"
                    )}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    onClick={() => carregarAlertas()}
                    className={cn(
                      "rounded-[1.1rem] border px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                      dark ? "border-white/10 bg-white/5 text-white/70 hover:text-white" : "border-[#edd7d4] bg-white text-[#8c6b75] hover:text-[#1a1a1f]"
                    )}
                  >
                    {loadingAlertas ? 'Atualizando...' : 'Atualizar'}
                  </button>
                  <button
                    onClick={handleMarcarTodasLidas}
                    disabled={alertasUnread === 0}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-[1.1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] transition-all disabled:cursor-not-allowed disabled:opacity-45",
                      dark ? "bg-[#e29ba8] text-[#1a1a1f]" : "bg-[#2f242d] text-white"
                    )}
                  >
                    <CheckCheck className="h-4 w-4" />
                    Marcar tudo como lido
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {alertas.length === 0 ? (
                  <div className={cn(
                    "mt-6 rounded-[2rem] border border-dashed p-8 text-center",
                    dark ? "border-white/10 bg-white/[0.03]" : "border-[#edd7d4] bg-white"
                  )}>
                    <Bell className="mx-auto h-10 w-10 text-[#e29ba8]" />
                    <p className="mt-4 text-lg font-black text-gray-900 dark:text-white">Nenhum alerta por enquanto</p>
                    <p className="mt-2 text-sm text-[#8c6b75] dark:text-white/55">
                      Novos agendamentos online vao aparecer aqui automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertas.map((alerta) => {
                      const lida = Array.isArray(alerta.lidaPorUserIds) && alerta.lidaPorUserIds.includes(userId);
                      return (
                        <button
                          key={alerta.id}
                          type="button"
                          onClick={() => handleOpenAlerta(alerta)}
                          className={cn(
                            "w-full rounded-[1.6rem] border p-4 text-left transition-all",
                            lida
                              ? dark
                                ? "border-white/5 bg-white/[0.03] text-white/72"
                                : "border-[#edd7d4] bg-white text-[#5d4750]"
                              : dark
                                ? "border-[#e29ba8]/28 bg-[#e29ba8]/10 text-white shadow-[0_24px_48px_-32px_rgba(226,155,168,0.6)]"
                                : "border-[#efc8ce] bg-[#fff4f5] text-[#2f242d] shadow-[0_24px_48px_-34px_rgba(226,155,168,0.45)]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!lida && <span className="h-2 w-2 rounded-full bg-[#10b981]" />}
                                <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#e29ba8]">
                                  {alerta.tipo === 'agendamento_online_novo' ? 'Agendamento online' : 'Alerta'}
                                </p>
                              </div>
                              <p className="mt-2 text-base font-black text-gray-900 dark:text-white">{alerta.titulo}</p>
                              <p className="mt-2 text-sm leading-relaxed">{alerta.mensagem}</p>
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 opacity-50" />
                          </div>
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#8c6b75] dark:text-white/38">
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
