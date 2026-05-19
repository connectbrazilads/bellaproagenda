import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Globe, Lock, Mail, Scissors, Sparkles, User } from 'lucide-react';
import { signup } from '../../services/api';
import { setAdminSession } from '../../lib/session';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    salaoNome: '',
    slug: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="brand-page-dark flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-[#f0b5bf]/12 blur-[120px]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#de97a5]/10 blur-[140px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-gray-200 dark:border-white/10 bg-white/[0.04] text-[#efbac2]">
            <Sparkles size={28} />
          </div>
          <p className="brand-kicker">Nova unidade</p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-brand-display text-gray-900 dark:text-white">
            Fundar sua <span className="brand-text-gradient">operação</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-200 dark:text-white/58">
            Configure o acesso inicial do salão com uma experiência mais alinhada à nova identidade visual da BellaPro.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }} className="rounded-[2.8rem] border border-gray-200 dark:border-white/5 bg-[#241b22]/94 p-4 md:p-8 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.92)] md:p-10">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:p-6 md:grid-cols-2">
            <FormField label="Nome do fundador" icon={<User size={15} />} value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} placeholder="Ex: Ana Martins" />
            <FormField label="Nome do salão" icon={<Scissors size={15} />} value={form.salaoNome} onChange={handleSalaoNome} placeholder="Ex: BellaPro Studio" />
            <FormField label="E-mail de acesso" icon={<Mail size={15} />} type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="ana@exemplo.com" />
            <FormField label="Senha inicial" icon={<Lock size={15} />} type="password" value={form.senha} onChange={(value) => setForm((prev) => ({ ...prev, senha: value }))} placeholder="Digite uma senha forte" />

            <div className="md:col-span-2">
              <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
                <Globe size={13} className="text-[#efbac2]" />
                URL do salão
              </label>
              <div className="flex overflow-hidden rounded-[1.3rem] border border-gray-200 dark:border-white/5 bg-[#332832] focus-within:border-[#e29ba8]/28">
                <span className="border-r border-gray-200 dark:border-white/5 px-4 py-3 text-sm text-gray-500 dark:text-white/40">bellapro.agenda/</span>
                <input
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                  className="w-full bg-transparent px-4 py-3 text-sm text-gray-900 dark:text-white outline-none placeholder:text-white/28"
                  placeholder="bella-pro-studio"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              {error && (
                <div className="mb-4 rounded-[1.2rem] border border-red-300/18 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white shadow-[0_24px_60px_-28px_rgba(222,151,165,0.95)] transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? 'Criando conta...' : <>Criar unidade <ArrowRight size={15} /></>}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-gray-200 dark:border-white/5 pt-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
              Já tem acesso?
              <Link to="/admin/login" className="ml-2 text-[#efbac2] transition hover:text-gray-900 dark:text-white">
                Entrar no painel
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FormField({ label, icon, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/42">
        <span className="text-[#efbac2]">{icon}</span>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-[1.3rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
      />
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
