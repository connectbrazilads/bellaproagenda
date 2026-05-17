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
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6 sm:p-8">
        <p className="brand-kicker">Comunicação de base</p>
        <h1 className="mt-3 font-brand-display text-5xl leading-none text-white">Comunique a base com segmentação simples e histórico.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">
          Envie avisos por plano ou status, acompanhe campanhas recentes e mantenha relacionamento operacional com os salões.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-[#efb1bb]" />
            <h2 className="text-lg font-black text-white">Novo comunicado</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Mensagem</label>
            <textarea
              rows={8}
              value={form.mensagem}
              onChange={(event) => setForm((prev) => ({ ...prev, mensagem: event.target.value }))}
              className="w-full rounded-[1.4rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
              placeholder="Escreva aqui a mensagem que será enviada para os salões."
              required
            />
          </div>

          {feedback && (
            <div className={`rounded-[1rem] px-4 py-3 text-sm ${feedback.includes('sucesso') ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border border-red-500/20 bg-red-500/10 text-red-200'}`}>
              {feedback}
            </div>
          )}

          <button type="submit" disabled={sending} className="brand-button-primary inline-flex items-center justify-center gap-3 rounded-[1.3rem] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em]">
            {sending ? 'Enviando...' : 'Enviar comunicado'}
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
          <h2 className="text-lg font-black text-white">Histórico recente</h2>
          <div className="mt-5 space-y-3">
            {history.length === 0 && <EmptyCopy text="Nenhuma campanha registrada ainda." />}
            {history.map((item) => (
              <div key={item.id} className="rounded-[1.3rem] border border-white/6 bg-black/16 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.assunto}</p>
                    <p className="mt-1 text-xs text-white/42">
                      {new Date(item.createdAt).toLocaleString('pt-BR')} · plano {item.filtroPlano || 'todos'} · status {item.filtroStatus || 'todos'}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/[0.05] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#efb1bb]">
                    {item.enviados} envios
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/58">{item.mensagem}</p>
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
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
        required
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyCopy({ text }) {
  return <div className="rounded-[1.3rem] border border-white/6 bg-black/16 px-4 py-6 text-sm text-white/48">{text}</div>;
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-[2rem] border px-6 py-16 text-center ${error ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-white/6 bg-[#231b22] text-white/54'}`}>
      {message}
    </div>
  );
}
