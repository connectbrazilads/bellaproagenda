import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Scissors,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { signup } from '../../services/api';
import { setAdminSession } from '../../lib/session';
import LandingBrandLogo from '../../components/LandingBrandLogo';
import { cn } from '../../lib/utils';

const planMeta = {
  basic: {
    name: 'Plano Essencial',
    monthly: 'R$ 79/mês',
    annual: 'R$ 63/mês no anual',
    limit: 'Até 2 profissionais',
  },
  pro: {
    name: 'Plano Profissional',
    monthly: 'R$ 149/mês',
    annual: 'R$ 119/mês no anual',
    limit: 'Até 6 profissionais',
  },
  enterprise: {
    name: 'Plano Elite IA',
    monthly: 'R$ 249/mês',
    annual: 'R$ 199/mês no anual',
    limit: 'Até 15+ profissionais',
  },
};

const trialBenefits = [
  '7 dias gratuitos para testar todas as rotinas do salão',
  'Sem cartão de crédito e sem taxa de implantação',
  'Link público de agendamento 24h gerado imediatamente',
  'Agenda multi-profissional, comandas e controle de caixa por turno',
  'Importação facilitada da sua base de clientes',
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPlanKey = searchParams.get('plano') || '';
  const selectedCycle = searchParams.get('ciclo') === 'mensal' ? 'mensal' : 'anual';
  const selectedPlan = planMeta[selectedPlanKey] || null;

  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    salaoNome: '',
    slug: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = useMemo(
    () => [
      { label: '8+ caracteres', ok: form.senha.length >= 8 },
      { label: '1 maiúscula', ok: /[A-Z]/.test(form.senha) },
      { label: '1 minúscula', ok: /[a-z]/.test(form.senha) },
      { label: '1 número', ok: /[0-9]/.test(form.senha) },
    ],
    [form.senha]
  );

  function handleSalaoNome(value) {
    setForm((prev) => ({
      ...prev,
      salaoNome: value,
      slug: slugify(value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await signup(form);
      localStorage.setItem('salao_data', JSON.stringify(response.data.salao));
      setAdminSession({
        token: response.data.token,
        expiresAt: response.data.expiresAt,
        userId: response.data.user?.id || '',
        role: response.data.user?.role || 'admin',
        profissionalId: response.data.user?.profissionalId || '',
        permissions: response.data.user?.permissions || [],
        actionPermissions: response.data.user?.actionPermissions || [],
      });
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="editorial-light-page grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      {/* Left Column — Clean Onboarding Form */}
      <div className="flex flex-col justify-between px-5 py-7 sm:px-10 lg:px-14 xl:px-16">
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
          className="mx-auto my-8 w-full max-w-xl"
        >
          <div className="mb-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#b84c6b]">
              Teste grátis de 7 dias
            </p>
            <h1 className="mt-2 font-brand-display text-3xl font-bold tracking-[-0.02em] text-[#23141c] sm:text-4xl">
              Crie a conta do seu salão
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#5b4852]">
              Preencha os dados abaixo para ativar seu painel administrativo e seu link exclusivo de agendamento online.
            </p>
          </div>

          {selectedPlan && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c65d7b]/25 bg-[#fdf3f6] px-4 py-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b84c6b]">
                  Interesse selecionado • 7 dias grátis
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#23141c]">
                  {selectedPlan.name} ({selectedPlan.limit}) —{' '}
                  <span className="font-semibold text-[#5b4852]">
                    {selectedCycle === 'mensal' ? selectedPlan.monthly : selectedPlan.annual}
                  </span>
                </p>
              </div>
              <Link
                to="/#planos"
                className="text-xs font-bold text-[#b84c6b] underline decoration-[#c65d7b]/40 underline-offset-4 hover:text-[#963653]"
              >
                Ver planos
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Seu nome completo"
              icon={User}
              value={form.nome}
              onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))}
              placeholder="Ex: Ana Martins"
              autoComplete="name"
            />
            <Field
              label="Nome do salão ou estúdio"
              icon={Scissors}
              value={form.salaoNome}
              onChange={handleSalaoNome}
              placeholder="Ex: Studio Ana Martins"
              autoComplete="organization"
            />
            <Field
              label="E-mail de acesso"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              placeholder="ana@seusalao.com.br"
              autoComplete="email"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
                Senha de acesso
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7f8c]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.senha}
                  onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
                  required
                  autoComplete="new-password"
                  placeholder="Ex: Salao2026"
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

            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-[#7c6771]">
                  Requisitos da senha:
                </span>
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

            <div className="space-y-1.5 sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
                <Globe className="h-3.5 w-3.5 text-[#b84c6b]" />
                Link exclusivo de agendamento online
              </label>
              <div className="flex overflow-hidden rounded-2xl border border-[#23141c]/15 bg-white focus-within:border-[#be5b75] focus-within:ring-4 focus-within:ring-[#be5b75]/15">
                <span className="flex items-center border-r border-[#23141c]/10 bg-[#faf7f5] px-3.5 py-3.5 text-xs font-semibold text-[#7c6771] sm:text-sm">
                  bellaproagenda.com.br/
                </span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))
                  }
                  className="w-full bg-transparent px-3.5 py-3.5 text-sm font-semibold text-[#23141c] outline-none placeholder:font-normal placeholder:text-[#9e8892]"
                  placeholder="studio-ana-martins"
                  required
                />
              </div>
              <p className="text-[11px] text-[#7c6771]">
                Esse será o endereço para você colocar na bio do Instagram e enviar no WhatsApp.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-800 sm:col-span-2">
                {error}
              </div>
            )}

            <div className="pt-1 sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="editorial-btn-primary flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-4 text-sm font-bold disabled:opacity-55"
              >
                {loading ? (
                  'Preparando seu salão...'
                ) : (
                  <>
                    Criar minha conta grátis
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-2xl border border-[#23141c]/10 bg-white/80 p-4 text-center">
            <p className="text-sm text-[#5b4852]">
              Já possui uma conta BellaPro?{' '}
              <Link
                to="/login"
                className="font-bold text-[#b84c6b] transition hover:text-[#963653]"
              >
                Entrar no painel
              </Link>
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8a7580]">
          <span>© {new Date().getFullYear()} BellaPro Agenda</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Dados isolados por salão com segurança
          </span>
        </div>
      </div>

      {/* Right Column — Deep Plum Trial Value Panel */}
      <div className="relative hidden overflow-hidden bg-[#23141c] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#c65d7b]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#f7c1b6]/20 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#f2b8c6]">
            <Sparkles className="h-3.5 w-3.5" />
            Comece sem compromisso
          </span>

          <h2 className="mt-6 font-brand-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white">
            Em 5 minutos seu salão já está pronto para receber{' '}
            <span className="italic text-[#f0aab8]">agendamentos online.</span>
          </h2>

          <ul className="mt-8 space-y-4">
            {trialBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-white/85">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f0aab8]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-[1.8rem] border border-white/15 bg-white/[0.06] p-6 backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f0aab8]">
            Prévia do seu link público
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#180d13]/80 px-4 py-3 text-xs font-semibold text-white/90">
            <Globe className="h-4 w-4 shrink-0 text-[#f0aab8]" />
            <span className="truncate">
              bellaproagenda.com.br/{form.slug || 'seu-salao'}
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/65">
            Assim que concluir o cadastro, você já acessa o painel completo do salão para cadastrar seus serviços, profissionais e liberar o link para suas clientes.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#4c3843]">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a7f8c]" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="editorial-input w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium"
        />
      </div>
    </div>
  );
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
