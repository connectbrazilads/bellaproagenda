import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { login, requestPasswordReset, resetPassword } from '../../services/api';
import { setAdminSession } from '../../lib/session';
import BrandLogo from '../../components/BrandLogo';

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const navigate = useNavigate();
  const resetToken = searchParams.get('resetToken');
  const isResetMode = useMemo(() => !!resetToken, [resetToken]);

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
      setErro('Informe o e-mail de acesso para recuperar a senha.');
      return;
    }

    setLoadingReset(true);
    setErro('');
    setMsg('');
    try {
      await requestPasswordReset({ email: email.trim().toLowerCase() });
      setMsg('Se o e-mail existir, enviamos um link de recuperação.');
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
      setMsg('Senha redefinida com sucesso. Agora você pode entrar.');
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
    <div className="bella-login-shell relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_30%)]" />
        <div className="absolute left-[-8%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-[#d7868f2c] blur-[160px]" />
        <div className="absolute bottom-[-14%] right-[-10%] h-[25rem] w-[25rem] rounded-full bg-[#f0b89322] blur-[160px]" />
        <div className="absolute left-1/2 top-[8%] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-[#ffffff10] blur-[180px]" />
        <div className="bella-login-grid absolute inset-0 opacity-30" />
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-5xl">
        <div className="grid gap-4 md:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <BrandLogo className="mb-10" />
              <div>
                <p className="brand-kicker text-[#f2b7bd]">Painel do salão</p>
                <h1 className="mt-4 font-brand-display text-2xl leading-[0.94] tracking-[-0.06em] text-[#fff2f4] sm:text-4xl sm:text-6xl">
                  Elegância na marca.
                  <span className="bella-login-heading block">Clareza na operação.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#d8cace]">
                  A BellaPro Agenda entra com visual premium, rotina organizada e uma experiência mais refinada para recepção, gestão e atendimento.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bella-login-card rounded-[1.8rem] p-5">
                  <p className="brand-kicker text-[#f0b2b8]">Controle</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#c7b8bc]">
                    Agenda, clientes, equipe e financeiro em uma mesma linguagem visual.
                  </p>
                </div>
                <div className="bella-login-card rounded-[1.8rem] p-5">
                  <p className="brand-kicker text-[#f0b2b8]">Presença</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#c7b8bc]">
                    Um ambiente mais sofisticado e coerente com o posicionamento da marca.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            className="bella-login-panel rounded-[2.6rem] p-7 shadow-[0_40px_110px_-46px_rgba(0,0,0,0.92)] sm:p-10"
          >
            <div className="mb-10 lg:hidden">
              <BrandLogo />
            </div>

            <div className="mb-8">
              <p className="brand-kicker text-[#f0b2b8]">
                {isResetMode ? 'Recuperação de acesso' : 'Acesso administrativo'}
              </p>
              <h2 className="mt-3 font-brand-display text-2xl tracking-[-0.05em] text-[#fff3f3] sm:text-4xl">
                {isResetMode ? 'Redefina sua senha' : 'Entre no painel BellaPro'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#d5c7cb]">
                {isResetMode
                  ? 'Crie uma nova senha forte para retomar o acesso com segurança.'
                  : 'Use seu login do salão para acessar agenda, operação e configurações.'}
              </p>
            </div>

            <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="space-y-5">
              <InputField
                label="E-mail"
                icon={Mail}
                type="email"
                value={email}
                onChange={setEmail}
                required={!isResetMode}
                disabled={isResetMode}
                placeholder="seu@email.com"
              />

              {!isResetMode && (
                <InputField
                  label="Senha"
                  icon={Lock}
                  type="password"
                  value={senha}
                  onChange={setSenha}
                  required
                  placeholder="Digite sua senha"
                />
              )}

              {isResetMode && (
                <>
                  <InputField
                    label="Nova senha"
                    icon={Lock}
                    type="password"
                    value={novaSenha}
                    onChange={setNovaSenha}
                    required
                    placeholder="Nova senha forte"
                  />
                  <InputField
                    label="Confirmar nova senha"
                    icon={Lock}
                    type="password"
                    value={confirmarNovaSenha}
                    onChange={setConfirmarNovaSenha}
                    required
                    placeholder="Repita a nova senha"
                  />
                </>
              )}

              {msg && (
                <div className="rounded-[1.4rem] border border-emerald-400/25 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
                  {msg}
                </div>
              )}

              {erro && (
                <div className="rounded-[1.4rem] border border-rose-400/25 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bella-login-button flex w-full items-center justify-center gap-3 rounded-[1.5rem] px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.28em] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Processando...' : (
                  <>
                    {isResetMode ? 'Redefinir senha' : 'Entrar no sistema'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {!isResetMode && (
                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={loadingReset}
                  className="w-full text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#f0b2b8] transition hover:text-[#ffd4c7]"
                >
                  {loadingReset ? 'Enviando link...' : 'Esqueci minha senha'}
                </button>
              )}
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function InputField({ label, icon: Icon, type, value, onChange, placeholder, required, disabled = false }) {
  return (
    <div className="space-y-2">
      <label className="brand-kicker text-[#d9a6ad]">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3d7d1]/70" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className="bella-login-input w-full rounded-[1.35rem] px-5 py-4 pl-12 text-sm font-medium premium-focus-input"
        />
      </div>
    </div>
  );
}
