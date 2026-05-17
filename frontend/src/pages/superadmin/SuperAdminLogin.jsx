import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { saLogin } from '../../services/api';
import { setSuperAdminSession } from '../../lib/session';
import BrandLogo from '../../components/BrandLogo';

export default function SuperAdminLogin() {
  const [form, setForm] = useState({ email: '', senha: '' });
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
    <div className="brand-page-dark flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo stacked className="items-center text-center" />
        </div>

        <form onSubmit={handleSubmit} className="brand-panel-dark rounded-[2.4rem] p-8 space-y-5">
          <div>
            <p className="brand-kicker text-[#efb1bb]">Controle da plataforma</p>
            <h1 className="mt-3 font-brand-display text-4xl tracking-[-0.05em] text-white">Acesso Super Admin</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/56">
              Gerencie salões, operação da plataforma e visão consolidada da BellaPro Agenda.
            </p>
          </div>

          <Input
            label="Email"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={(value) => setForm({ ...form, email: value })}
            placeholder="superadmin@bellapro.com"
          />

          <Input
            label="Senha"
            icon={Lock}
            type="password"
            value={form.senha}
            onChange={(value) => setForm({ ...form, senha: value })}
            placeholder="Digite sua senha"
          />

          {erro && (
            <div className="rounded-[1.2rem] border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="brand-button-primary flex w-full items-center justify-center gap-3 rounded-[1.4rem] px-5 py-4 text-[11px] font-extrabold uppercase tracking-[0.26em] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Entrando...' : (
              <>
                Entrar
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
    <div className="space-y-2">
      <label className="brand-kicker text-[#cfa3ab]">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="brand-input-dark w-full rounded-[1.3rem] px-5 py-4 pl-12 text-sm font-medium"
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  );
}
