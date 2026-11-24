import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { saLogin } from '../../services/api';
import { setSuperAdminSession } from '../../lib/session';
import LandingBrandLogo from '../../components/LandingBrandLogo';

export default function SuperAdminLogin() {
  const [form, setForm] = useState({ email: '', senha: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await saLogin(form);
      setSuperAdminSession({
        nome: res.data.nome,
        expiresAt: res.data.expiresAt,
      });
      navigate('/superadmin');
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F5] px-5 py-10 text-[#23141C]">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LandingBrandLogo variant="lightBg" size="sm" />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#EAE1E4] bg-white px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#B84C6B]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cockpit SaaS
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-[#EAE1E4] bg-white p-7 shadow-sm sm:p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">Controle da plataforma</p>
            <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C]">Acesso Super Admin</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6B5761]">
              Gerencie salões, faturamento, suporte e saúde global da BellaPro Agenda.
            </p>
          </div>

          <Input
            label="E-mail"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={(value) => setForm({ ...form, email: value })}
            placeholder="superadmin@bellapro.com"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#6B5761]">Senha</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8792]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="w-full rounded-2xl border border-[#E2D5DA] bg-[#FAF7F5] py-3.5 pl-11 pr-11 text-sm font-medium text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white focus:ring-2 focus:ring-[#B84C6B]/15"
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8E7682] transition hover:text-[#23141C]"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#23141C] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#3A222E] disabled:opacity-50"
          >
            {loading ? 'Entrando...' : (
              <>
                Entrar no cockpit
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, icon: Icon, type, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8792]" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-[#E2D5DA] bg-[#FAF7F5] py-3.5 pl-11 pr-4 text-sm font-medium text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white focus:ring-2 focus:ring-[#B84C6B]/15"
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  );
}
