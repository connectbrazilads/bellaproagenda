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
        expiresAt: res.data.expiresAt,
        userId: user.id || '',
        role: user.role || '',
        profissionalId: user.profissionalId || '',
        permissions: user.permissions || res.data.permissions || [],
        actionPermissions: user.actionPermissions || res.data.actionPermissions || [],
      });
      navigate('/admin');
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel entrar. Verifique seus dados.');
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
      setMsg('Se o e-mail existir, enviamos um link de recuperacao.');
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel solicitar a recuperacao.');
    } finally {
      setLoadingReset(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (novaSenha !== confirmarNovaSenha) {
      setErro('A confirmacao da nova senha não confere.');
      return;
    }

    setLoading(true);
    setErro('');
    setMsg('');
    try {
      await resetPassword({ token: resetToken, novaSenha });
      setMsg('Senha redefinida com sucesso. Agora voce pode entrar.');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setSearchParams({});
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="brand-page-dark relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-12%] h-[26rem] w-[26rem] rounded-full bg-[#e29ba826] blur-[140px]" />
        <div className="absolute bottom-[-12%] right-[-10%] h-[24rem] w-[24rem] rounded-full bg-[#f7c1b61c] blur-[140px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-5xl">
        <div className="grid gap-4 md:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <BrandLogo className="mb-10" />
              <div>
                <p className="brand-kicker text-[#f0bac0]">Painel do s?o</p>
                <h1 className="mt-4 font-brand-display text-2xl sm:text-4xl sm:text-6xl leading-[0.94] tracking-[-0.06em] text-gray-900 dark:text-white">
                  Elegancia na marca.
                  <span className="brand-text-gradient block">Clareza na opera??o.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/62">
                  A BellaPro Agenda entra com visual premium, rotina organizada e uma experiencia mais refinada para recepcao, gestao e atendimento.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="brand-card-dark rounded-[1.8rem] p-5">
                  <p className="brand-kicker text-[#efb1bb]">Controle</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-white/70">Agenda, clientes, equipe e financeiro em uma mesma linguagem visual.</p>
                </div>
                <div className="brand-card-dark rounded-[1.8rem] p-5">
                  <p className="brand-kicker text-[#efb1bb]">Presenca</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-white/70">Um ambiente mais sofisticado e coerente com o posicionamento da marca.</p>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 }}
            className="brand-panel-dark rounded-[2.6rem] p-7 shadow-[0_40px_110px_-46px_rgba(0,0,0,0.92)] sm:p-10"
          >
            <div className="mb-10 lg:hidden">
              <BrandLogo />
            </div>

            <div className="mb-8">
              <p className="brand-kicker text-[#efb1bb]">{isResetMode ? 'Recuperacao de acesso' : 'Acesso administrativo'}</p>
              <h2 className="mt-3 font-brand-display text-2xl sm:text-4xl tracking-[-0.05em] text-gray-900 dark:text-white">
                {isResetMode ? 'Redefina sua senha' : 'Entre não painel BellaPro'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-200 dark:text-white/56">
                {isResetMode
                  ? 'Crie uma nova senha forte para retomar o acesso com seguranca.'
                  : 'Use seu login do s?o para acessar agenda, opera??o e configuracoes.'}
              </p>
            </div>

            <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="space-y-5">
              <InputField
                label="Email"
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
                className="brand-button-primary flex w-full items-center justify-center gap-3 rounded-[1.5rem] px-6 py-4 text-[11px] font-extrabold uppercase tracking-[0.28em] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Processando...' : (
                  <>
                    {isResetMode ? 'Redefinir senha' : 'Entrar não sistema'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {!isResetMode && (
                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={loadingReset}
                  className="w-full text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#efb1bb] transition hover:text-[#f7c1b6]"
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
      <label className="brand-kicker text-[#cfa3ab]">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className="brand-input-dark w-full rounded-[1.35rem] px-5 py-4 pl-12 text-sm font-medium"
        />
      </div>
    </div>
  );
}
