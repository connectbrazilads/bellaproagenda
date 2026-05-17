import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LifeBuoy, Save, Send } from 'lucide-react';
import { saGetTickets, saResponderTicket, saUpdateTicket } from '../../services/api';

const STATUS_OPTIONS = ['aberto', 'aguardando_superadmin', 'aguardando_salao', 'resolvido', 'fechado'];
const PRIORIDADE_OPTIONS = ['baixa', 'normal', 'alta', 'critica'];

function badgeTone(status) {
  if (status === 'resolvido') return 'bg-emerald-500/12 text-emerald-200';
  if (status === 'fechado') return 'bg-white/10 text-white/50';
  if (status === 'aguardando_salao') return 'bg-sky-500/12 text-sky-200';
  return 'bg-amber-500/12 text-amber-200';
}

export default function SuperAdminSupport() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [replying, setReplying] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [reply, setReply] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await saGetTickets(statusFilter ? { status: statusFilter } : {});
      const nextTickets = response.data || [];
      setTickets(nextTickets);
      setSelectedId((current) => current || nextTickets[0]?.id || '');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar os tickets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [selectedId, tickets]
  );

  async function saveMeta() {
    if (!selectedTicket) return;
    setSavingMeta(true);
    try {
      const response = await saUpdateTicket(selectedTicket.id, {
        status: selectedTicket.status,
        prioridade: selectedTicket.prioridade,
        responsavelNome: selectedTicket.responsavelNome,
      });
      setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? response.data : ticket)));
      toast.success('Ticket atualizado.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel atualizar o ticket.');
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleReply(event) {
    event.preventDefault();
    if (!selectedTicket) return;

    setReplying(true);
    try {
      const response = await saResponderTicket(selectedTicket.id, {
        mensagem: reply,
        status: selectedTicket.status === 'resolvido' ? 'resolvido' : 'aguardando_salao',
      });
      setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? response.data : ticket)));
      setReply('');
      toast.success('Resposta enviada.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel responder o ticket.');
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6 sm:p-8">
        <p className="brand-kicker">Suporte central</p>
        <h1 className="mt-3 font-brand-display text-5xl leading-none text-white">Tickets operacionais entre saloes e superadmin</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">
          Acompanhe solicitacoes financeiras, problemas de acesso, integracoes e demandas operacionais em uma fila unica.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${statusFilter === '' ? 'bg-[#de97a5] text-white' : 'bg-white/[0.05] text-white/60'}`}
        >
          Todos
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${statusFilter === status ? 'bg-[#de97a5] text-white' : 'bg-white/[0.05] text-white/60'}`}
          >
            {status.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <StateBox message="Carregando tickets..." />
      ) : tickets.length === 0 ? (
        <StateBox message="Nenhum ticket encontrado." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={`w-full rounded-[1.5rem] border p-4 text-left ${selectedId === ticket.id ? 'border-[#e29ba8]/30 bg-[#2c222a]' : 'border-white/6 bg-[#231b22]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">#{ticket.numero} {ticket.assunto}</p>
                    <p className="mt-1 text-xs text-white/42">{ticket.salao?.nome} · {ticket.categoria}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTone(ticket.status)}`}>
                    {ticket.status.replaceAll('_', ' ')}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          {selectedTicket ? (
            <section className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Ticket #{selectedTicket.numero}</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{selectedTicket.assunto}</h2>
                  <p className="mt-2 text-sm text-white/54">{selectedTicket.salao?.nome} · /{selectedTicket.salao?.slug}</p>
                </div>
                <LifeBuoy className="h-6 w-6 text-[#efb1bb]" />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Status"
                  value={selectedTicket.status}
                  onChange={(value) => setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, status: value } : ticket)))}
                  options={STATUS_OPTIONS}
                />
                <Select
                  label="Prioridade"
                  value={selectedTicket.prioridade}
                  onChange={(value) => setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, prioridade: value } : ticket)))}
                  options={PRIORIDADE_OPTIONS}
                />
                <Field
                  label="Responsavel"
                  value={selectedTicket.responsavelNome || ''}
                  onChange={(value) => setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, responsavelNome: value } : ticket)))}
                />
              </div>

              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="flex items-center justify-center gap-2 rounded-[1.2rem] bg-white/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingMeta ? 'Salvando...' : 'Salvar status'}
              </button>

              <div className="space-y-3">
                {selectedTicket.mensagens?.map((mensagem) => (
                  <div key={mensagem.id} className={`rounded-[1.4rem] p-4 ${mensagem.autorTipo === 'superadmin' ? 'bg-[#362933]' : 'bg-black/16'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{mensagem.autorNome}</p>
                      <p className="text-xs text-white/40">{new Date(mensagem.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-white/68">{mensagem.mensagem}</p>
                    {mensagem.anexos?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mensagem.anexos.map((anexo) => (
                          <a key={anexo} href={anexo} target="_blank" rel="noreferrer" className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/78">
                            Ver anexo
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4 space-y-3">
                <textarea
                  rows={5}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="w-full rounded-[1.3rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Responder para o salao"
                  required
                />
                <button
                  type="submit"
                  disabled={replying}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {replying ? 'Enviando...' : 'Responder ticket'}
                </button>
              </form>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function StateBox({ message }) {
  return (
    <div className="rounded-[2rem] border border-white/6 bg-[#231b22] px-6 py-16 text-center text-white/54">
      {message}
    </div>
  );
}
