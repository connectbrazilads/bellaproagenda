import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { login, requestPasswordReset, resetPassword } from '../../services/api';
import { setAdminSession } from '../../lib/session';
import LandingBrandLogo from '../../components/LandingBrandLogo';
import { cn } from '../../lib/utils';

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const navigate = useNavigate();

  const resetToken = searchParams.get('resetToken');
  const isResetMode = useMemo(() => !!resetToken, [resetToken]);

  const passwordChecks = useMemo(
    () => [
      { label: '8+ caracteres', ok: novaSenha.length >= 8 },
      { label: '1 maiúscula', ok: /[A-Z]/.test(novaSenha) },
      { label: '1 minúscula', ok: /[a-z]/.test(novaSenha) },
      { label: '1 número', ok: /[0-9]/.test(novaSenha) },
    ],
    [novaSenha]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setMsg('');

    try {
      const res = await login({ email: email.trim().toLowerCase(), senha });
      const user = res.data.user || {
        role: res.data.role,
        profissionalId: res.data.profissionalId,
      };

      setAdminSession({
        token: res.data.token,
        expiresAt: res.data.expiresAt,
        userId: user.id || '',
        role: user.role || '',
        profissionalId: user.profissionalId || '',
        permissions: user.permissions || res.data.permissions || [],
        actionPermissions: user.actionPermissions || res.data.actionPermissions || [],
      });
      navigate('/admin');
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível entrar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReset() {
    if (!email.trim()) {
      setErro('Informe o e-mail de acesso acima para receber o link de recuperação.');
      return;
    }

    setLoadingReset(true);
    setErro('');
    setMsg('');
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() });
      setMsg('Se o e-mail existir na plataforma, enviamos um link de recuperação.');
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível solicitar a recuperação.');
    } finally {
      setLoadingReset(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (novaSenha !== confirmarNovaSenha) {
      setErro('A confirmação da nova senha não confere.');
      return;
    }

    setLoading(true);
    setErro('');
    setMsg('');
    try {
      await resetPassword({ token: resetToken, novaSenha });
      setMsg('Senha redefinida com sucesso. Agora você já pode entrar no painel.');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setSearchParams({});
    } catch (error) {
      setErro(error.response?.data?.error || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="editorial-light-page grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
      {/* Left Column — Clean Form */}
      <div className="flex flex-col justify-between px-5 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="BellaPro Agenda - Voltar ao início">
            <LandingBrandLogo variant="lightBg" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b5761] transition hover:text-[#23141c]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao site
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto my-10 w-full max-w-md"
        >
          <div className="mb-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b84c6b]">
              {isResetMode ? 'Recuperação de acesso' : 'Acesso ao painel'}
            </p>
            <h1 className="mt-2.5 font-brand-display text-3xl font-bold tracking-[-0.02em] text-[#23141c] sm:text-4xl">
              {isResetMode ? 'Defina sua nova senha' : 'Bem-vindo de volta'}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#5b4852]">
              {isResetMode
                ? 'Crie uma nova senha forte para retomar o acesso ao painel do seu salão.'
                : 'Entre com seu e-mail e senha para gerenciar agenda, equipe e caixa do salão.'}
            </p>
          </div>

          <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="space-y-5">
            {!isResetMode && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
                  E-mail de acesso
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7f8c]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="voce@seusalao.com.br"
                    className="editorial-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium"
                  />
                </div>
              </div>
            )}

            {!isResetMode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestReset}
                    disabled={loadingReset}
                    className="text-xs font-semibold text-[#b84c6b] transition hover:text-[#963653] disabled:opacity-50"
                  >
                    {loadingReset ? 'Enviando link...' : 'Esqueci minha senha'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7f8c]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="editorial-input w-full rounded-2xl py-3.5 pl-11 pr-11 text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#8b727f] transition hover:text-[#23141c]"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {isResetMode && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
                    Nova senha
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7f8c]" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Crie uma senha forte"
                      className="editorial-input w-full rounded-2xl py-3.5 pl-11 pr-11 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#8b727f] transition hover:text-[#23141c]"
                      aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {passwordChecks.map((rule) => (
                      <span
                        key={rule.label}
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition',
                          rule.ok
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#f1e7ea] text-[#7c6771]'
                        )}
                      >
                        {rule.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7f8c]" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmarNovaSenha}
                      onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repita a nova senha"
                      className="editorial-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium"
                    />
                  </div>
                </div>
              </>
            )}

            {msg && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-800">
                {msg}
              </div>
            )}

            {erro && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-800">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="editorial-btn-primary flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-4 text-sm font-bold disabled:opacity-55"
            >
              {loading ? (
                'Entrando...'
              ) : (
                <>
                  {isResetMode ? 'Salvar nova senha' : 'Entrar no painel'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-[#23141c]/10 bg-white/80 p-4 text-center">
            <p className="text-sm text-[#5b4852]">
              Ainda não tem conta no BellaPro?{' '}
              <Link
                to="/signup"
                className="font-bold text-[#b84c6b] transition hover:text-[#963653]"
              >
                Testar 7 dias grátis
              </Link>
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8a7580]">
          <span>© {new Date().getFullYear()} BellaPro Agenda</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Conexão criptografada e sessão protegida
          </span>
        </div>
      </div>

      {/* Right Column — Deep Plum Editorial Showcase (Desktop) */}
      <div className="relative hidden overflow-hidden bg-[#23141c] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#c65d7b]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-[#f7c1b6]/20 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f2b8c6]">
            <Sparkles className="h-3.5 w-3.5" />
            Painel Administrativo BellaPro
          </span>

          <h2 className="mt-6 max-w-lg font-brand-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white xl:text-5xl">
            Elegância na marca.{' '}
            <span className="italic text-[#f0aab8]">Clareza total na operação.</span>
          </h2>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Acesse sua agenda multi-profissional, acompanhe o fechamento de caixa por turno e gerencie sua equipe em tempo real.
          </p>
        </div>

        {/* Mini System Preview Card */}
        <div className="relative my-8 rounded-[1.8rem] border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f0aab8]">
                Resumo em tempo real
              </p>
              <p className="mt-1 text-base font-bold text-white">Operação Sob Controle</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300">
              Auditado
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-[#f0aab8]">
                <CalendarDays className="h-4 w-4" />
                <span className="text-[11px] font-semibold">Agenda do dia</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-white">96%</p>
              <p className="text-[11px] text-white/60">Horários confirmados no WhatsApp</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Wallet className="h-4 w-4" />
                <span className="text-[11px] font-semibold">Diferença de caixa</span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-emerald-300">R$ 0,00</p>
              <p className="text-[11px] text-white/60">Conferência por turno sem furos</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4 text-xs text-white/80">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#f0aab8]" />
              <span>Perfis separados para Gestor, Recepção e Profissionais</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#f0aab8]" />
              <span>Comanda única multi-profissional com comissão automática</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#f0aab8]" />
              <span>Isolamento seguro por unidade e histórico auditável</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm italic leading-relaxed text-white/85">
            “Depois que implantamos o BellaPro, o fechamento de caixa virou questão de dois minutos e cada profissional acompanha sua própria agenda sem ruído.”
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#f0aab8]">
            Camila Nogueira • Maison Nogueira Beleza
          </p>
        </div>
      </div>
    </div>
  );
}
