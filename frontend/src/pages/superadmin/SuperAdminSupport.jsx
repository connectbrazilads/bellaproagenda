import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LifeBuoy, Save, Send } from 'lucide-react';
import { saGetTickets, saResponderTicket, saUpdateTicket } from '../../services/api';

const STATUS_OPTIONS = ['aberto', 'aguardando_superadmin', 'aguardando_salao', 'resolvido', 'fechado'];
const PRIORIDADE_OPTIONS = ['baixa', 'normal', 'alta', 'critica'];

function badgeTone(status) {
  if (status === 'resolvido') return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'fechado') return 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#8E7682]';
  if (status === 'aguardando_salao') return 'border border-sky-200 bg-sky-50 text-sky-700';
  return 'border border-amber-200 bg-amber-50 text-amber-700';
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
      toast.error(error.response?.data?.error || 'Não foi possível carregar os tickets.');
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
      toast.error(error.response?.data?.error || 'Não foi possível atualizar o ticket.');
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
      toast.error(error.response?.data?.error || 'Não foi possível responder o ticket.');
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Suporte central</p>
        <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
          Tickets operacionais entre salões e superadmin
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#6B5761]">
          Acompanhe solicitações financeiras, problemas de acesso, integrações e demandas operacionais em uma fila única.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${statusFilter === '' ? 'bg-[#23141C] text-white' : 'border border-[#EAE1E4] bg-white text-[#6B5761] hover:text-[#23141C]'}`}
        >
          Todos
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${statusFilter === status ? 'bg-[#23141C] text-white' : 'border border-[#EAE1E4] bg-white text-[#6B5761] hover:text-[#23141C]'}`}
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
          <aside className="space-y-2.5">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === ticket.id
                    ? 'border-[#B84C6B] bg-[#FDF7F9] ring-1 ring-[#B84C6B]/15'
                    : 'border-[#EAE1E4] bg-white hover:border-[#D9C6CE]'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#23141C]">#{ticket.numero} {ticket.assunto}</p>
                    <p className="mt-1 text-xs text-[#6B5761]">{ticket.salao?.nome} · {ticket.categoria}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${badgeTone(ticket.status)}`}>
                    {ticket.status.replaceAll('_', ' ')}
                  </span>
                </div>
              </button>
            ))}
          </aside>

          {selectedTicket ? (
            <section className="space-y-5 rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFE7EA] pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B84C6B]">Ticket #{selectedTicket.numero}</p>
                  <h2 className="mt-1 font-brand-display text-2xl font-semibold text-[#23141C]">{selectedTicket.assunto}</h2>
                  <p className="mt-1 text-xs text-[#6B5761]">{selectedTicket.salao?.nome} · /{selectedTicket.salao?.slug}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF7F9] text-[#B84C6B]">
                  <LifeBuoy className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
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
                  label="Responsável"
                  value={selectedTicket.responsavelNome || ''}
                  onChange={(value) => setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? { ...ticket, responsavelNome: value } : ticket)))}
                />
              </div>

              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#23141C] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3A222E] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingMeta ? 'Salvando...' : 'Salvar status'}
              </button>

              <div className="space-y-3">
                {selectedTicket.mensagens?.map((mensagem) => (
                  <div
                    key={mensagem.id}
                    className={`rounded-2xl border p-4 ${
                      mensagem.autorTipo === 'superadmin'
                        ? 'border-[#F0D5DE] bg-[#FDF7F9]'
                        : 'border-[#EFE7EA] bg-[#FAF7F5]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#23141C]">{mensagem.autorNome}</p>
                      <p className="text-xs text-[#8E7682]">{new Date(mensagem.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-[#4A3842]">{mensagem.mensagem}</p>
                    {mensagem.anexos?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mensagem.anexos.map((anexo) => (
                          <a
                            key={anexo}
                            href={anexo}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[#E2D5DA] bg-white px-3 py-1 text-[11px] font-bold text-[#B84C6B] transition hover:border-[#B84C6B]"
                          >
                            Ver anexo
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="space-y-3 rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
                <textarea
                  rows={4}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="w-full rounded-xl border border-[#E2D5DA] bg-white px-4 py-3 text-sm text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B]"
                  placeholder="Responder para o salão..."
                  required
                />
                <button
                  type="submit"
                  disabled={replying}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B84C6B] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#9E3E5A] disabled:opacity-60"
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
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
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
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function StateBox({ message }) {
  return (
    <div className="rounded-3xl border border-[#EAE1E4] bg-white px-6 py-16 text-center text-sm text-[#6B5761]">
      {message}
    </div>
  );
}
