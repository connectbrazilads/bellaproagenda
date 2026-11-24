import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { hasAdminSession, hasSuperAdminSession } from './lib/session';
import LandingBrandLogo from './components/LandingBrandLogo';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const BookingPage = lazy(() => import('./pages/Booking/BookingPage'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const SignupPage = lazy(() => import('./pages/admin/SignupPage'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Agenda = lazy(() => import('./pages/admin/Agenda'));
const Agendamentos = lazy(() => import('./pages/admin/Agendamentos'));
const Profissionais = lazy(() => import('./pages/admin/Profissionais'));
const Servicos = lazy(() => import('./pages/admin/Servicos'));
const Pacotes = lazy(() => import('./pages/admin/Pacotes'));
const Clientes = lazy(() => import('./pages/admin/Clientes'));
const Bloqueios = lazy(() => import('./pages/admin/Bloqueios'));
const Configuracoes = lazy(() => import('./pages/admin/Configuracoes'));
const Inbox = lazy(() => import('./pages/admin/Inbox'));
const BaseConhecimento = lazy(() => import('./pages/admin/BaseConhecimento'));
const Produtos = lazy(() => import('./pages/admin/Produtos'));
const Migracao = lazy(() => import('./pages/admin/Migracao'));
const Financeiro = lazy(() => import('./pages/admin/Financeiro'));
const Faturas = lazy(() => import('./pages/admin/Faturas'));
const Fidelidade = lazy(() => import('./pages/admin/Fidelidade'));
const Notificacoes = lazy(() => import('./pages/admin/Notificacoes'));
const Relatorio = lazy(() => import('./pages/admin/Relatorio'));
const Remuneracao = lazy(() => import('./pages/admin/Remuneracao'));
const Suporte = lazy(() => import('./pages/admin/Suporte'));
const SuperAdminLogin = lazy(() => import('./pages/superadmin/SuperAdminLogin'));
const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const SuperAdminBilling = lazy(() => import('./pages/superadmin/SuperAdminBilling'));
const SuperAdminSupport = lazy(() => import('./pages/superadmin/SuperAdminSupport'));
const SuperAdminSaloes = lazy(() => import('./pages/superadmin/SuperAdminSaloes'));
const SuperAdminSaude = lazy(() => import('./pages/superadmin/SuperAdminSaude'));
const SuperAdminComunicacao = lazy(() => import('./pages/superadmin/SuperAdminComunicacao'));
const SuperAdminSeguranca = lazy(() => import('./pages/superadmin/SuperAdminSeguranca'));

function PrivateRoute({ children }) {
  return hasAdminSession() ? children : <Navigate to="/admin/login" replace />;
}

function SuperAdminRoute({ children }) {
  return hasSuperAdminSession() ? children : <Navigate to="/superadmin/login" replace />;
}

function BookingSlugWrapper() {
  const { slug } = useParams();
  return <BookingPage slug={slug} />;
}

function BookingCompatWrapper() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

function AdminBookingRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F5] px-6 text-[#23141C]">
      <div className="space-y-5 text-center">
        <div className="mx-auto flex justify-center">
          <LandingBrandLogo variant="lightBg" size="sm" />
        </div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-[#EAE1E4] border-t-[#B84C6B]" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Carregando interface</p>
          <p className="mt-1.5 text-sm text-[#6B5761]">Preparando sua experiência BellaPro.</p>
        </div>
      </div>
    </div>
  );
}

class SuperAdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, stack: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Super admin render error', error, info);
    this.setState({ stack: info?.componentStack || '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF7F5] px-6 text-[#23141C]">
          <div className="w-full max-w-xl rounded-3xl border border-[#EAE1E4] bg-white p-8 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Super Admin</p>
            <h1 className="mt-3 font-brand-display text-3xl font-semibold text-[#23141C]">Não foi possível abrir esta tela.</h1>
            <p className="mt-3 text-sm text-[#6B5761]">
              A interface evitou a tela branca e capturou o erro abaixo.
            </p>
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-800">
              <p className="font-semibold">{this.state.error?.message || 'Erro sem mensagem.'}</p>
              {this.state.stack ? (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-rose-700/80">{this.state.stack}</pre>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <div className="brand-app">
      <Toaster position="top-right" reverseOrder={false} />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<SignupPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin/login" element={<LoginPage />} />

          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route
            path="/superadmin"
            element={
              <SuperAdminRoute>
                <SuperAdminErrorBoundary>
                  <SuperAdminLayout />
                </SuperAdminErrorBoundary>
              </SuperAdminRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="billing" element={<SuperAdminBilling />} />
            <Route path="suporte" element={<SuperAdminSupport />} />
            <Route path="saloes" element={<SuperAdminSaloes />} />
            <Route path="saude" element={<SuperAdminSaude />} />
            <Route path="comunicacao" element={<SuperAdminComunicacao />} />
            <Route path="seguranca" element={<SuperAdminSeguranca />} />
          </Route>

          <Route path="/:slug" element={<BookingSlugWrapper />} />
          <Route path="/booking/:slug" element={<BookingCompatWrapper />} />
          <Route path="/booking" element={<LandingPage />} />
          <Route path="/admin/:slug" element={<AdminBookingRedirect />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="agendamentos" element={<Agendamentos />} />
            <Route path="profissionais" element={<Profissionais />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="pacotes" element={<Pacotes />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="bloqueios" element={<Bloqueios />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="base-conhecimento" element={<BaseConhecimento />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="faturas" element={<Faturas />} />
            <Route path="fidelidade" element={<Fidelidade />} />
            <Route path="notificacoes" element={<Notificacoes />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="relatorio" element={<Relatorio />} />
            <Route path="remuneracao" element={<Remuneracao />} />
            <Route path="suporte" element={<Suporte />} />
            <Route path="migracao" element={<Migracao />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}
