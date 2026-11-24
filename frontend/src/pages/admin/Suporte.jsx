import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LifeBuoy, Send, Upload } from 'lucide-react';
import {
  createTicketSalao,
  getTicketsSalao,
  responderTicketSalao,
  uploadImage,
} from '../../services/api';
import { cn } from '../../lib/utils';

const CATEGORIAS = ['Financeiro', 'Acesso', 'Integração', 'Agenda', 'Treinamento', 'Outro'];

function badgeTone(status) {
  if (status === 'resolvido') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25';
  }
  if (status === 'fechado') {
    return 'bg-[#f4eef1] text-[#6b5761] border-[#e2d5da] dark:bg-white/10 dark:text-white/55 dark:border-white/10';
  }
  if (status === 'aguardando_salao') {
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25';
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
      toast.error(error.response?.data?.error || 'Não foi possível carregar o suporte.');
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
      toast.error(error.response?.data?.error || 'Não foi possível abrir o ticket.');
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
      setTickets((prev) =>
        prev.map((ticket) => (ticket.id === selectedTicket.id ? response.data : ticket))
      );
      setReply('');
      setReplyFile(null);
      toast.success('Mensagem enviada para o suporte.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível responder o ticket.');
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <header className="space-y-2 border-b border-[#eae1e4] pb-5 dark:border-[#28212f]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
          <LifeBuoy className="h-4 w-4" />
          <span>Central de Suporte</span>
        </div>
        <h1 className="font-brand-display text-3xl font-bold leading-tight text-[#23141c] dark:text-white sm:text-4xl">
          Atendimento <span className="italic text-[#b84c6b]">BellaPro</span>
        </h1>
        <p className="max-w-2xl text-sm text-[#6b5761] dark:text-white/60">
          Abra chamados técnicos, tire dúvidas financeiras ou solicite ajuda na configuração do seu salão.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* New Ticket Form */}
        <form
          onSubmit={handleCreate}
          className="h-fit space-y-4 rounded-2xl border border-[#eae1e4] bg-white p-6 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721]"
        >
          <div className="border-b border-[#f0e8eb] pb-3.5 dark:border-[#28212f]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
              Novo chamado
            </p>
            <h2 className="mt-0.5 font-brand-display text-xl font-bold text-[#23141c] dark:text-white">
              Abrir ticket
            </h2>
          </div>

          <Field
            label="Assunto"
            value={form.assunto}
            onChange={(value) => setForm((prev) => ({ ...prev, assunto: value }))}
            placeholder="Resumo breve da solicitação"
          />
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
            <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
              Descrição
            </label>
            <textarea
              rows={4}
              value={form.descricao}
              onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
              placeholder="Detalhe o que aconteceu ou como podemos ajudar..."
              className="w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] px-3.5 py-3 text-sm text-[#23141c] outline-none placeholder:text-[#8c727e] focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
              required
            />
          </div>

          <label className="block rounded-xl border border-dashed border-[#d8cbd0] bg-[#faf7f5] px-3.5 py-3 text-xs text-[#6b5761] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white/65">
            <span className="mb-1.5 block font-semibold">Anexo opcional (print ou PDF)</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setCreateFile(event.target.files?.[0] || null)}
              className="block w-full text-xs file:mr-2.5 file:rounded-lg file:border-0 file:bg-[#fdf2f5] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-[#b84c6b]"
            />
          </label>

          <button
            type="submit"
            disabled={creating}
            className="editorial-btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-60"
          >
            <LifeBuoy className="h-4 w-4" />
            {creating ? 'Abrindo ticket...' : 'Abrir ticket'}
          </button>
        </form>

        {/* Tickets List & Thread */}
        <section className="rounded-2xl border border-[#eae1e4] bg-white p-6 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721]">
          <div className="mb-5 border-b border-[#f0e8eb] pb-3.5 dark:border-[#28212f]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
              Fila do salão
            </p>
            <h2 className="mt-0.5 font-brand-display text-xl font-bold text-[#23141c] dark:text-white">
              Tickets enviados
            </h2>
          </div>

          {loading ? (
            <StateBox message="Carregando tickets..." />
          ) : tickets.length === 0 ? (
            <StateBox message="Nenhum ticket aberto ainda." />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
              <div className="space-y-2.5">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className={cn(
                      'w-full rounded-xl border p-3.5 text-left transition-colors',
                      selectedId === ticket.id
                        ? 'border-[#eccbd4] bg-[#fdf2f5] dark:border-[#c65d7b]/35 dark:bg-[#c65d7b]/15'
                        : 'border-[#eae1e4] bg-[#faf7f5] hover:bg-white dark:border-[#28212f] dark:bg-white/[0.02]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#23141c] dark:text-white">
                          #{ticket.numero} {ticket.assunto}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#745e69] dark:text-white/55">
                          {ticket.categoria}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize',
                          badgeTone(ticket.status)
                        )}
                      >
                        {ticket.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedTicket ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#eae1e4] bg-[#faf7f5] p-4 dark:border-[#28212f] dark:bg-white/[0.03]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
                          Ticket #{selectedTicket.numero}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-[#23141c] dark:text-white">
                          {selectedTicket.assunto}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-bold capitalize',
                          badgeTone(selectedTicket.status)
                        )}
                      >
                        {selectedTicket.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedTicket.mensagens?.map((mensagem) => (
                      <div
                        key={mensagem.id}
                        className={cn(
                          'rounded-xl border p-4',
                          mensagem.autorTipo === 'superadmin'
                            ? 'border-[#eccbd4] bg-[#fdf2f5] dark:border-[#c65d7b]/30 dark:bg-[#c65d7b]/15'
                            : 'border-[#eae1e4] bg-white dark:border-[#28212f] dark:bg-white/[0.02]'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold text-[#23141c] dark:text-white">
                            {mensagem.autorNome}
                          </p>
                          <p className="text-[11px] text-[#745e69] dark:text-white/45">
                            {new Date(mensagem.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#432e39] dark:text-white/80">
                          {mensagem.mensagem}
                        </p>
                        {mensagem.anexos?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {mensagem.anexos.map((anexo) => (
                              <a
                                key={anexo}
                                href={anexo}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-[#e2d5da] bg-white px-3 py-1.5 text-xs font-bold text-[#b84c6b] hover:bg-[#fdf2f5] dark:border-[#352b3e] dark:bg-white/5 dark:text-[#f0aab8]"
                              >
                                Ver anexo
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleReply}
                    className="space-y-3 rounded-xl border border-[#eae1e4] bg-[#faf7f5] p-4 dark:border-[#28212f] dark:bg-white/[0.03]"
                  >
                    <textarea
                      rows={3}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      className="w-full rounded-xl border border-[#e2d5da] bg-white px-3.5 py-3 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
                      placeholder="Escreva sua resposta ao suporte..."
                      required
                    />
                    <label className="block rounded-xl border border-dashed border-[#d8cbd0] bg-white px-3.5 py-2.5 text-xs text-[#6b5761] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white/65">
                      <span className="mb-1 block font-semibold">Anexo opcional</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) => setReplyFile(event.target.files?.[0] || null)}
                        className="block w-full text-xs file:mr-2.5 file:rounded-lg file:border-0 file:bg-[#fdf2f5] file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-[#b84c6b]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={replying}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#23141c] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#38212d] disabled:opacity-60 dark:bg-[#c65d7b] dark:hover:bg-[#b24b69]"
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
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] px-3.5 text-sm text-[#23141c] outline-none placeholder:text-[#8c727e] focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
        required
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] px-3.5 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function StateBox({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e2d5da] bg-[#faf7f5] px-6 py-12 text-center text-sm text-[#745e69] dark:border-[#352b3e] dark:bg-white/[0.02] dark:text-white/55">
      {message}
    </div>
  );
}
