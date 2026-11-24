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
  CheckCheck,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import {
  getEffectivePermissions,
  getEffectiveActionPermissions,
  readStoredPermissions,
  readStoredActionPermissions,
} from '../../lib/permissions';
import ModalPDV from '../../components/ModalPDV';
import { clearAdminSession } from '../../lib/session';
import {
  getAlertasAgendamento,
  logoutAdmin,
  markAlertaAgendamentoLido,
  markTodosAlertasAgendamentoLidos,
} from '../../services/api';
import BrandLogo from '../../components/BrandLogo';
import toast from 'react-hot-toast';

const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'dashboard' },
      { to: '/admin/agenda', label: 'Agenda', icon: Calendar, permission: 'agenda' },
      { to: '/admin/agendamentos', label: 'Agendamentos', icon: ClipboardList, permission: 'agendamentos' },
      { to: '/admin/inbox', label: 'Inbox', icon: MessageSquare, permission: 'inbox' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { to: '/admin/clientes', label: 'Clientes', icon: Users, permission: 'clientes' },
      { to: '/admin/profissionais', label: 'Profissionais', icon: User, permission: 'profissionais' },
      { to: '/admin/servicos', label: 'Serviços', icon: Scissors, permission: 'servicos' },
      { to: '/admin/pacotes', label: 'Pacotes', icon: Gift, permission: 'pacotes' },
      { to: '/admin/produtos', label: 'Estoque', icon: Package, permission: 'produtos' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/admin/financeiro', label: 'Financeiro', icon: DollarSign, permission: 'financeiro' },
      { to: '/admin/remuneracao', label: 'Remuneração', icon: ClipboardList, permission: 'remuneracao' },
      { to: '/admin/relatorio', label: 'Relatórios', icon: TrendingUp, permission: 'relatorio' },
      { to: '/admin/faturas', label: 'Faturas', icon: FileText, permission: 'faturas' },
    ],
  },
  {
    label: 'Crescimento',
    items: [
      { to: '/admin/base-conhecimento', label: 'Base IA', icon: Brain, permission: 'base_conhecimento' },
      { to: '/admin/fidelidade', label: 'Fidelidade', icon: Gem, permission: 'fidelidade' },
      { to: '/admin/notificacoes', label: 'Mensagens', icon: Smartphone, permission: 'notificacoes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/admin/bloqueios', label: 'Bloqueios', icon: Ban, permission: 'bloqueios' },
      { to: '/admin/migracao', label: 'Migração', icon: Download, permission: 'migracao' },
      { to: '/admin/suporte', label: 'Suporte', icon: LifeBuoy, permission: 'suporte' },
      { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, permission: 'configuracoes' },
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
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="mb-2 font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
            Ops! Algo deu errado.
          </h2>
          <p className="mb-6 max-w-md text-sm text-[#6b5761] dark:text-white/60">
            Não foi possível carregar esta tela. Tente recarregar a página ou voltar para o início.
          </p>
          <button
            onClick={() => (window.location.href = '/admin')}
            className="rounded-full bg-[#23141c] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#3a222f] dark:bg-white dark:text-[#23141c]"
          >
            Voltar ao início
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1280 : false
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  const [alertasOpen, setAlertasOpen] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [alertasUnread, setAlertasUnread] = useState(0);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const isSubPage = location.pathname !== '/admin' && location.pathname !== '/admin/';
  const isAgendaRoute = location.pathname.startsWith('/admin/agenda');
  const knownAlertasRef = useRef(new Set());
  const alertasHydratedRef = useRef(false);

  const role = localStorage.getItem('salao_user_role') || 'gestor';
  const userId = localStorage.getItem('salao_user_id') || '';
  const userPermissions = getEffectivePermissions(role, readStoredPermissions());
  const userActionPermissions = getEffectiveActionPermissions(role, readStoredActionPermissions());
  const podeVerAlertas = ['agenda', 'dashboard', 'agendamentos'].some((permission) =>
    userPermissions.includes(permission)
  );
  const canToggleSidebar = viewportWidth >= 1024;
  const effectiveCollapsed = collapsed;

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
    }, 220);
  }

  function canAccessPath(path) {
    if (path === '/admin/financeiro') {
      return (
        userPermissions.includes('financeiro') ||
        CAIXA_ACTION_PERMISSIONS.some((permission) => userActionPermissions.includes(permission))
      );
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
        toast.error('Não foi possível carregar as notificações.');
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
      toast.error('Não foi possível marcar as notificações como lidas.');
    }
  }

  async function logout() {
    try {
      await logoutAdmin();
    } catch {
      // Keep local logout resilient even if the cookie is already gone.
    }

    clearAdminSession();
    navigate('/login');
  }

  const visibleGroups = NAV_GROUPS.map((group) => {
    const visibleItems = group.items.filter((item) => canAccessPath(item.to));
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
    <div
      className={cn(
        'admin-panel flex min-h-screen md:h-screen font-sans overflow-x-hidden md:overflow-hidden',
        dark ? 'bg-[#120f15] text-[#faf7f5]' : 'bg-[#faf7f5] text-[#23141c]'
      )}
      style={{ '--admin-mobile-header-height': '64px' }}
    >
      {/* Desktop Sidebar — Clean, Solid, Fast */}
      <aside
        className={cn(
          'relative hidden lg:flex flex-col shrink-0 transition-[width] duration-200 ease-out border-r',
          effectiveCollapsed ? 'w-[76px]' : 'w-[244px]',
          dark
            ? 'bg-[#18131d] border-[#28212f]'
            : 'bg-white border-[#eae1e4]'
        )}
      >
        {/* Collapse Toggle */}
        {canToggleSidebar && (
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className={cn(
              'absolute -right-3.5 top-6 z-40 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition',
              dark
                ? 'border-[#352b3e] bg-[#1c1721] text-white/75 hover:border-[#c65d7b] hover:text-white'
                : 'border-[#e2d5da] bg-white text-[#6b5761] hover:border-[#c65d7b] hover:text-[#23141c]'
            )}
            title={effectiveCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <ChevronLeft
              size={14}
              className={cn('transition-transform duration-200', effectiveCollapsed && 'rotate-180')}
            />
          </button>
        )}

        {/* Brand & Quick Utility Icons */}
        <div
          className={cn(
            'flex items-center border-b px-4 py-4',
            dark ? 'border-[#28212f]' : 'border-[#f0e8eb]',
            effectiveCollapsed ? 'flex-col gap-3 px-2' : 'justify-between gap-2'
          )}
        >
          {effectiveCollapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#23141c] text-[#f0aab8] font-brand-display text-xl font-bold">
              B
            </div>
          ) : (
            <BrandLogo
              compact
              variant={dark ? 'darkBg' : 'lightBg'}
              imageClassName="w-[132px] drop-shadow-none"
            />
          )}

          <div className={cn('flex items-center gap-1.5', effectiveCollapsed && 'flex-col')}>
            {podeVerAlertas && (
              <button
                type="button"
                onClick={() => {
                  setAlertasOpen(true);
                  carregarAlertas({ silent: true });
                }}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-lg transition',
                  dark
                    ? 'text-white/65 hover:bg-white/10 hover:text-white'
                    : 'text-[#6b5761] hover:bg-[#f6eef0] hover:text-[#23141c]'
                )}
                title="Central de notificações"
              >
                <Bell className="h-4 w-4" />
                {alertasUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#c65d7b] px-1 text-[9px] font-bold leading-none text-white">
                    {alertasUnread > 9 ? '9+' : alertasUnread}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={toggle}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition',
                dark
                  ? 'text-white/65 hover:bg-white/10 hover:text-white'
                  : 'text-[#6b5761] hover:bg-[#f6eef0] hover:text-[#23141c]'
              )}
              title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!effectiveCollapsed && (
                <p
                  className={cn(
                    'px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                    dark ? 'text-white/35' : 'text-[#967e8a]'
                  )}
                >
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={effectiveCollapsed ? item.label : ''}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center rounded-xl transition-colors duration-150',
                      effectiveCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                      isActive
                        ? dark
                          ? 'bg-[#c65d7b]/20 text-white font-semibold'
                          : 'bg-[#23141c] text-white font-semibold shadow-sm'
                        : dark
                          ? 'text-white/65 hover:bg-white/5 hover:text-white font-medium'
                          : 'text-[#5b4852] hover:bg-[#f7eff1] hover:text-[#23141c] font-medium'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-[#f0aab8]'
                            : dark
                              ? 'text-white/45 group-hover:text-[#f0aab8]'
                              : 'text-[#8c727e] group-hover:text-[#b84c6b]'
                        )}
                      />
                      {!effectiveCollapsed && (
                        <span className="truncate text-[13px] leading-none">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout Footer */}
        <div className={cn('border-t p-3', dark ? 'border-[#28212f]' : 'border-[#f0e8eb]')}>
          <button
            type="button"
            onClick={logout}
            title={effectiveCollapsed ? 'Encerrar sessão' : ''}
            className={cn(
              'flex w-full items-center rounded-xl text-[13px] font-semibold transition-colors',
              effectiveCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
              dark
                ? 'text-white/55 hover:bg-rose-500/15 hover:text-rose-300'
                : 'text-[#6b5761] hover:bg-rose-50 hover:text-rose-700'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!effectiveCollapsed && <span>Encerrar sessão</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div
        className={cn(
          'lg:hidden fixed top-0 left-0 right-0 z-[70] flex h-16 items-center justify-between px-4 border-b',
          dark
            ? 'bg-[#18131d] border-[#28212f]'
            : 'bg-white border-[#eae1e4]'
        )}
      >
        <div className="flex items-center gap-2.5">
          {isSubPage && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition',
                dark ? 'bg-white/5 text-white/75' : 'bg-[#f6eef0] text-[#5b4852]'
              )}
              aria-label="Voltar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <BrandLogo
            compact
            variant={dark ? 'darkBg' : 'lightBg'}
            imageClassName="w-[126px] drop-shadow-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {podeVerAlertas && (
            <button
              type="button"
              onClick={() => {
                setAlertasOpen(true);
                carregarAlertas({ silent: true });
              }}
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-xl',
                dark ? 'text-white/70 hover:bg-white/10' : 'text-[#5b4852] hover:bg-[#f6eef0]'
              )}
              aria-label="Abrir notificações"
            >
              <Bell className="h-5 w-5" />
              {alertasUnread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#c65d7b] px-1 text-[9px] font-bold text-white">
                  {alertasUnread > 9 ? '9+' : alertasUnread}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              dark ? 'text-white/70 hover:bg-white/10' : 'text-[#5b4852] hover:bg-[#f6eef0]'
            )}
            aria-label="Alternar tema"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              dark ? 'bg-white/10 text-white' : 'bg-[#23141c] text-white'
            )}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] bg-black/50 lg:hidden"
            onClick={closeMobileMenu}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn(
                'z-[80] h-full w-72 overflow-y-auto overscroll-contain border-r px-4 py-6 shadow-2xl',
                dark
                  ? 'border-[#28212f] bg-[#18131d]'
                  : 'border-[#eae1e4] bg-white'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <BrandLogo
                  compact
                  variant={dark ? 'darkBg' : 'lightBg'}
                  imageClassName="w-[136px] drop-shadow-none"
                />
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    dark ? 'text-white/60 hover:bg-white/10' : 'text-[#6b5761] hover:bg-[#f6eef0]'
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-5">
                {visibleGroups.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <p
                      className={cn(
                        'px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                        dark ? 'text-white/35' : 'text-[#967e8a]'
                      )}
                    >
                      {group.label}
                    </p>
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      return (
                        <button
                          key={item.to}
                          type="button"
                          onClick={() => handleMobileNavigate(item.to)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors',
                            active
                              ? dark
                                ? 'bg-[#c65d7b]/20 text-white font-semibold'
                                : 'bg-[#23141c] text-white font-semibold'
                              : dark
                                ? 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                                : 'text-[#5b4852] hover:bg-[#f7eff1] hover:text-[#23141c] font-medium'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              active ? 'text-[#f0aab8]' : 'text-[#8c727e]'
                            )}
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className={cn('mt-6 border-t pt-4', dark ? 'border-[#28212f]' : 'border-[#f0e8eb]')}>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/15"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Encerrar sessão</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts Drawer */}
      <AnimatePresence>
        {alertasOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[82] bg-black/45"
            onClick={() => setAlertasOpen(false)}
          >
            <motion.aside
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={cn(
                'ml-auto flex h-full w-full max-w-md flex-col border-l shadow-2xl',
                dark
                  ? 'border-[#28212f] bg-[#18131d]'
                  : 'border-[#eae1e4] bg-white'
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={cn('border-b px-5 py-5', dark ? 'border-[#28212f]' : 'border-[#f0e8eb]')}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b84c6b]">
                      Central de alertas
                    </p>
                    <h2 className="mt-1 font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
                      Agendamentos
                    </h2>
                    <p className="mt-1 text-xs text-[#6b5761] dark:text-white/60">
                      {alertasUnread > 0
                        ? `${alertasUnread} notificação(ões) sem leitura.`
                        : 'Tudo em dia por aqui.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertasOpen(false)}
                    className={cn(
                      'rounded-xl p-2 transition',
                      dark
                        ? 'bg-white/5 text-white/65 hover:text-white'
                        : 'bg-[#f6eef0] text-[#6b5761] hover:text-[#23141c]'
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => carregarAlertas()}
                    className={cn(
                      'rounded-xl border px-3.5 py-2 text-xs font-semibold transition',
                      dark
                        ? 'border-white/10 bg-white/5 text-white/75 hover:text-white'
                        : 'border-[#e2d5da] bg-white text-[#5b4852] hover:bg-[#faf7f5]'
                    )}
                  >
                    {loadingAlertas ? 'Atualizando...' : 'Atualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleMarcarTodasLidas}
                    disabled={alertasUnread === 0}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
                      dark ? 'bg-[#c65d7b] text-white' : 'bg-[#23141c] text-white hover:bg-[#38212d]'
                    )}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Marcar tudo como lido
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {alertas.length === 0 ? (
                  <div
                    className={cn(
                      'mt-6 rounded-2xl border border-dashed p-8 text-center',
                      dark ? 'border-white/10 bg-white/[0.02]' : 'border-[#e2d5da] bg-[#faf7f5]'
                    )}
                  >
                    <Bell className="mx-auto h-8 w-8 text-[#c65d7b]" />
                    <p className="mt-3 text-base font-bold text-[#23141c] dark:text-white">
                      Nenhum alerta por enquanto
                    </p>
                    <p className="mt-1 text-xs text-[#6b5761] dark:text-white/55">
                      Novos agendamentos online vão aparecer aqui automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alertas.map((alerta) => {
                      const lida =
                        Array.isArray(alerta.lidaPorUserIds) &&
                        alerta.lidaPorUserIds.includes(userId);
                      return (
                        <button
                          key={alerta.id}
                          type="button"
                          onClick={() => handleOpenAlerta(alerta)}
                          className={cn(
                            'w-full rounded-2xl border p-4 text-left transition-colors',
                            lida
                              ? dark
                                ? 'border-[#28212f] bg-white/[0.02] text-white/70 hover:bg-white/[0.04]'
                                : 'border-[#efe7ea] bg-white text-[#5b4852] hover:bg-[#faf7f5]'
                              : dark
                                ? 'border-[#c65d7b]/40 bg-[#c65d7b]/15 text-white'
                                : 'border-[#c65d7b]/30 bg-[#fdf3f6] text-[#23141c]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!lida && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                                <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
                                  {alerta.tipo === 'agendamento_online_novo'
                                    ? 'Agendamento online'
                                    : 'Alerta'}
                                </p>
                              </div>
                              <p className="mt-1.5 text-sm font-bold text-[#23141c] dark:text-white">
                                {alerta.titulo}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed opacity-85">
                                {alerta.mensagem}
                              </p>
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 opacity-45" />
                          </div>
                          <p className="mt-2.5 text-[10px] font-semibold text-[#8c727e] dark:text-white/40">
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

      {/* Main Content Area */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'flex-1 min-h-0 overflow-x-hidden custom-scrollbar',
            isAgendaRoute
              ? 'flex flex-col overflow-hidden pt-[var(--admin-mobile-header-height,64px)] lg:p-3 lg:pt-3 xl:p-4'
              : 'overflow-y-auto px-4 pb-10 pt-[calc(var(--admin-mobile-header-height,64px)+1rem)] md:px-6 md:pt-6 lg:px-8 lg:pt-7 xl:px-10'
          )}
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
