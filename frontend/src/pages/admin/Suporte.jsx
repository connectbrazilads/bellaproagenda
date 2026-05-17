import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LifeBuoy, Send, Upload } from 'lucide-react';
import { createTicketSalao, getTicketsSalao, responderTicketSalao, uploadImage } from '../../services/api';

const CATEGORIAS = ['Financeiro', 'Acesso', 'Integracao', 'Agenda', 'Treinamento', 'Outro'];

function badgeTone(status) {
  if (status === 'resolvido') return 'bg-emerald-500/12 text-emerald-200';
  if (status === 'fechado') return 'bg-white/10 text-white/48';
  if (status === 'aguardando_salao') return 'bg-sky-500/12 text-sky-200';
  return 'bg-amber-500/12 text-amber-200';
}

export default function Suporte() {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [replying, setReplying] = useState(false);
  const [createFile, setCreateFile] = useState(null);
  const [replyFile, setReplyFile] = useState(null);
  const [form, setForm] = useState({
    assunto: '',
    categoria: 'Financeiro',
    prioridade: 'normal',
    descricao: '',
  });
  const [reply, setReply] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await getTicketsSalao();
      const nextTickets = response.data || [];
      setTickets(nextTickets);
      setSelectedId((current) => current || nextTickets[0]?.id || '');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar o suporte.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) || null,
    [selectedId, tickets]
  );

  async function maybeUpload(file) {
    if (!file) return null;
    const response = await uploadImage(file);
    return response.data?.url || null;
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    try {
      const anexoUrl = await maybeUpload(createFile);
      await createTicketSalao({ ...form, anexoUrl });
      toast.success('Ticket criado com sucesso.');
      setForm({ assunto: '', categoria: 'Financeiro', prioridade: 'normal', descricao: '' });
      setCreateFile(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel abrir o ticket.');
    } finally {
      setCreating(false);
    }
  }

  async function handleReply(event) {
    event.preventDefault();
    if (!selectedTicket) return;

    setReplying(true);
    try {
      const anexoUrl = await maybeUpload(replyFile);
      const response = await responderTicketSalao(selectedTicket.id, {
        mensagem: reply,
        anexoUrl,
      });
      setTickets((prev) => prev.map((ticket) => (ticket.id === selectedTicket.id ? response.data : ticket)));
      setReply('');
      setReplyFile(null);
      toast.success('Mensagem enviada para o suporte.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel responder o ticket.');
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
          <p className="brand-kicker">Suporte</p>
          <h1 className="mt-3 text-4xl font-brand-display text-white">Abrir ticket com o superadmin</h1>
          <p className="mt-3 text-sm text-white/58">
            Registre problemas operacionais, duvidas financeiras ou pedidos de configuracao.
          </p>
        </div>

        <form onSubmit={handleCreate} className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6 space-y-4">
          <Field label="Assunto" value={form.assunto} onChange={(value) => setForm((prev) => ({ ...prev, assunto: value }))} />
          <Select
            label="Categoria"
            value={form.categoria}
            onChange={(value) => setForm((prev) => ({ ...prev, categoria: value }))}
            options={CATEGORIAS}
          />
          <Select
            label="Prioridade"
            value={form.prioridade}
            onChange={(value) => setForm((prev) => ({ ...prev, prioridade: value }))}
            options={['baixa', 'normal', 'alta', 'critica']}
          />
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Descricao</label>
            <textarea
              rows={5}
              value={form.descricao}
              onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
              className="w-full rounded-[1.3rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
              required
            />
          </div>
          <label className="block rounded-[1.2rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white/70">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Anexo opcional</span>
            <input type="file" accept="image/*,.pdf" onChange={(event) => setCreateFile(event.target.files?.[0] || null)} />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
          >
            <LifeBuoy className="h-4 w-4" />
            {creating ? 'Abrindo...' : 'Abrir ticket'}
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Fila do salao</p>
            <h2 className="mt-2 text-2xl font-black text-white">Tickets enviados</h2>
          </div>
        </div>

        {loading ? (
          <StateBox message="Carregando tickets..." />
        ) : tickets.length === 0 ? (
          <StateBox message="Nenhum ticket aberto ainda." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                  className={`w-full rounded-[1.5rem] border p-4 text-left ${
                    selectedId === ticket.id ? 'border-[#e29ba8]/30 bg-[#2c222a]' : 'border-white/6 bg-black/16'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">#{ticket.numero} {ticket.assunto}</p>
                      <p className="mt-1 text-xs text-white/44">{ticket.categoria}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTone(ticket.status)}`}>
                      {ticket.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selectedTicket ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Ticket #{selectedTicket.numero}</p>
                      <h3 className="mt-2 text-xl font-black text-white">{selectedTicket.assunto}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTone(selectedTicket.status)}`}>
                      {selectedTicket.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>

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
                            <a
                              key={anexo}
                              href={anexo}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-white/8 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/80"
                            >
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
                    rows={4}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    className="w-full rounded-[1.3rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
                    placeholder="Responder ao suporte"
                    required
                  />
                  <label className="block rounded-[1.1rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white/70">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Anexo opcional</span>
                    <input type="file" accept="image/*,.pdf" onChange={(event) => setReplyFile(event.target.files?.[0] || null)} />
                  </label>
                  <button
                    type="submit"
                    disabled={replying}
                    className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-white/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                  >
                    {replyFile ? <Upload className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {replying ? 'Enviando...' : 'Responder ticket'}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        )}
      </section>
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
        required
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
    <div className="rounded-[1.5rem] border border-white/6 bg-black/16 px-6 py-12 text-center text-white/54">
      {message}
    </div>
  );
}
