import React, { useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { saEnviarComunicado } from '../../services/api';
import { appendAuditTrail, appendCampaignHistory, getCampaignHistory } from './superAdminData';
import { useSuperAdminOverview } from './useSuperAdminOverview';

const INITIAL_FORM = {
  assunto: '',
  mensagem: '',
  filtroPlano: '',
  filtroStatus: '',
};

export default function SuperAdminComunicacao() {
  const { loading, error } = useSuperAdminOverview();
  const [form, setForm] = useState(INITIAL_FORM);
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setHistory(getCampaignHistory());
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setFeedback('');
    try {
      const response = await saEnviarComunicado(form);
      const next = appendCampaignHistory({
        assunto: form.assunto,
        mensagem: form.mensagem,
        filtroPlano: form.filtroPlano,
        filtroStatus: form.filtroStatus,
        enviados: response.data.enviados ?? response.data.total ?? 0,
        falhas: response.data.falhas ?? 0,
      });
      appendAuditTrail({
        type: 'campaign_sent',
        actor: localStorage.getItem('sa_nome') || 'Super Admin',
        target: form.filtroPlano || form.filtroStatus || 'base completa',
        detail: `Comunicado "${form.assunto}" enviado para o segmento selecionado.`,
      });
      setHistory(next);
      setForm(INITIAL_FORM);
      setFeedback('Comunicado enviado com sucesso.');
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Não foi possível enviar o comunicado.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <StateBox message="Carregando central de comunicação..." />;
  if (error) return <StateBox message={error} error />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Comunicação de base</p>
        <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
          Comunique a base com segmentação simples e histórico
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#6B5761]">
          Envie avisos por plano ou status, acompanhe campanhas recentes e mantenha relacionamento operacional com os salões.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF7F9] text-[#B84C6B]">
              <Megaphone className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-[#23141C]">Novo comunicado</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Plano"
              value={form.filtroPlano}
              onChange={(value) => setForm((prev) => ({ ...prev, filtroPlano: value }))}
              options={[
                { value: '', label: 'Todos os planos' },
                { value: 'basic', label: 'Basic' },
                { value: 'pro', label: 'Pro' },
                { value: 'enterprise', label: 'Enterprise' },
              ]}
            />
            <Select
              label="Status"
              value={form.filtroStatus}
              onChange={(value) => setForm((prev) => ({ ...prev, filtroStatus: value }))}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'trial', label: 'Trial' },
                { value: 'ativo', label: 'Ativo' },
                { value: 'inadimplente', label: 'Inadimplente' },
                { value: 'suspenso', label: 'Suspenso' },
              ]}
            />
          </div>

          <Field label="Assunto" value={form.assunto} onChange={(value) => setForm((prev) => ({ ...prev, assunto: value }))} />

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Mensagem</label>
            <textarea
              rows={7}
              value={form.mensagem}
              onChange={(event) => setForm((prev) => ({ ...prev, mensagem: event.target.value }))}
              className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3 text-sm text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white"
              placeholder="Escreva aqui a mensagem que será enviada para os salões."
              required
            />
          </div>

          {feedback && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${feedback.includes('sucesso') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {feedback}
            </div>
          )}

          <button type="submit" disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B84C6B] px-6 py-3.5 text-xs font-bold text-white transition hover:bg-[#9E3E5A] disabled:opacity-60">
            {sending ? 'Enviando...' : 'Enviar comunicado'}
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#23141C]">Histórico recente</h2>
          <div className="mt-4 space-y-3">
            {history.length === 0 && <EmptyCopy text="Nenhuma campanha registrada ainda." />}
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#23141C]">{item.assunto}</p>
                    <p className="mt-1 text-xs text-[#6B5761]">
                      {new Date(item.createdAt).toLocaleString('pt-BR')} · plano {item.filtroPlano || 'todos'} · status {item.filtroStatus || 'todos'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#F0D5DE] bg-[#FDF7F9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B84C6B]">
                    {item.enviados} envios
                  </span>
                </div>
                <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[#6B5761]">{item.mensagem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
        required
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyCopy({ text }) {
  return <div className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] px-4 py-6 text-center text-sm text-[#6B5761]">{text}</div>;
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-3xl border px-6 py-16 text-center text-sm font-medium ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#EAE1E4] bg-white text-[#6B5761]'}`}>
      {message}
    </div>
  );
}
