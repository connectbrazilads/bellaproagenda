import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Filter,
  Phone,
  Scissors,
  Search,
  Smartphone,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  deleteAgendamento,
  getAgendamentos,
  updatePagamentoAgendamento,
  updateStatusAgendamento,
} from '../../services/api';
import { cn, formatDateBR, formatDurationLabel } from '../../lib/utils';

const STATUS_CONFIG = {
  confirmado: { label: 'Confirmado', tone: 'bg-blue-500/10 text-blue-200 border-blue-500/20', icon: Clock },
  em_atendimento: { label: 'Em atendimento', tone: 'bg-[#e29ba8]/10 text-[#f3c7cd] border-[#e29ba8]/24', icon: Scissors },
  concluido: { label: 'Concluído', tone: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', tone: 'bg-red-500/10 text-red-200 border-red-500/20', icon: XCircle },
};

const FORMAS = [
  { id: 'PIX', icon: Smartphone },
  { id: 'Cartao', icon: CreditCard },
  { id: 'Debito', icon: CreditCard },
  { id: 'Dinheiro', icon: Banknote },
];

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [pagamentoModal, setPagamentoModal] = useState(null);
  const [pagamentos, setPagamentos] = useState([{ forma: 'PIX', valor: '' }]);
  const [taxaOperadora, setTaxaOperadora] = useState('0');
  const [valorRecebido, setValorRecebido] = useState('');

  useEffect(() => {
    loadAgendamentos();
  }, [filtroData, filtroStatus]);

  async function loadAgendamentos() {
    setLoading(true);
    try {
      const response = await getAgendamentos({
        data: filtroData || undefined,
        status: filtroStatus || undefined,
      });
      setAgendamentos(response.data?.agendamentos || []);
    } finally {
      setLoading(false);
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return agendamentos.filter((agendamento) => {
      return (
        agendamento.clienteNome?.toLowerCase().includes(termo) ||
        agendamento.clienteTelefone?.includes(busca)
      );
    });
  }, [agendamentos, busca]);

  async function handleDelete(id) {
    if (!window.confirm('Deseja excluir este agendamento?')) return;
    await deleteAgendamento(id);
    await loadAgendamentos();
  }

  async function handleStatus(id, status) {
    await updateStatusAgendamento(id, status);
    await loadAgendamentos();
  }

  function calcTotal(agendamento) {
    return (
      Number(agendamento.servico?.preco || agendamento.pacote?.preco || 0) +
      (agendamento.itens?.reduce((sum, item) => sum + Number(item.preco || 0), 0) || 0) +
      (agendamento.produtos?.reduce((sum, produto) => sum + Number(produto.preco || 0) * Number(produto.quantidade || 0), 0) || 0)
    );
  }

  function calcPago(agendamento) {
    return agendamento.pagamentos?.reduce((sum, item) => sum + Number(item.valor || 0), 0) || 0;
  }

  function openPagamento(agendamento) {
    const total = calcTotal(agendamento);
    setPagamentoModal(agendamento);
    setPagamentos([{ forma: 'PIX', valor: total.toFixed(2) }]);
    setTaxaOperadora('0');
    setValorRecebido('');
  }

  function updatePagamento(index, field, value) {
    setPagamentos((prev) => prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)));
  }

  function addPagamento() {
    setPagamentos((prev) => [...prev, { forma: 'PIX', valor: '' }]);
  }

  function removePagamento(index) {
    setPagamentos((prev) => prev.filter((_, current) => current !== index));
  }

  async function confirmPagamento() {
    if (!pagamentoModal) return;

    await updatePagamentoAgendamento(pagamentoModal.id, {
      pagamentos: pagamentos.map((item) => ({
        forma: item.forma,
        valor: Number(item.valor || 0),
      })),
      taxaOperadora: Number(taxaOperadora || 0),
      valorRecebido: Number(valorRecebido || 0),
    });

    setPagamentoModal(null);
    await loadAgendamentos();
  }

  const totalDevido = pagamentoModal ? calcTotal(pagamentoModal) : 0;
  const totalPago = pagamentos.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const troco = pagamentos.some((item) => item.forma === 'Dinheiro')
    ? Math.max(0, Number(valorRecebido || 0) - totalDevido)
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="space-y-4 border-b border-gray-200 dark:border-white/5 pb-8">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#e29ba8]" />
          <p className="brand-kicker">Histórico de agenda</p>
        </div>
        <h1 className="text-3xl sm:text-5xl font-brand-display text-gray-900 dark:text-white">Agendamentos</h1>
        <p className="max-w-2xl text-base text-gray-200 dark:text-white/58">
          Acompanhe atendimentos finalizados, pagamentos recebidos e a linha do tempo operacional de cada reserva.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar cliente ou telefone"
            className="w-full rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-5 py-4 pl-12 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
          <input
            type="date"
            value={filtroData}
            onChange={(event) => setFiltroData(event.target.value)}
            className="w-full rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-5 py-4 pl-12 text-sm text-white outline-none focus:border-[#e29ba8]/28"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
            className="w-full appearance-none rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-5 py-4 pl-12 text-sm text-white outline-none focus:border-[#e29ba8]/28"
          >
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading && <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[#231b22] px-6 py-10 text-center text-white/46">Carregando agendamentos...</div>}

        {!loading && filtrados.length === 0 && (
          <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[#231b22] px-6 py-16 text-center text-white/46">
            Nenhum agendamento encontrado com os filtros atuais.
          </div>
        )}

        {!loading &&
          filtrados.map((agendamento) => {
            const total = calcTotal(agendamento);
            const pago = calcPago(agendamento);
            const status = STATUS_CONFIG[agendamento.status] || STATUS_CONFIG.confirmado;
            const StatusIcon = status.icon;

            return (
              <article key={agendamento.id} className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[#231b22] p-5 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{agendamento.clienteNome}</h2>
                      <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]', status.tone)}>
                        <StatusIcon size={13} />
                        {status.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-200 dark:text-white/56">
                      <span>{formatDateBR(agendamento.data)} · {agendamento.inicioHora}</span>
                      <span>{agendamento.profissional?.nome || 'Sem profissional'}</span>
                      <span className="inline-flex items-center gap-2">
                        <Phone size={13} />
                        {agendamento.clienteTelefone}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-[#e29ba8]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#f3c7cd]">
                        {agendamento.servico?.nome || agendamento.pacote?.nome || 'Sem serviço principal'}
                      </span>
                      <span className="rounded-full bg-white/6 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 dark:text-white/64">
                        {formatDurationLabel((agendamento.servico?.duracaoMin ?? agendamento.pacote?.duracaoMin ?? 0) + (agendamento.itens?.reduce((sum, item) => sum + Number(item.duracaoMin || 0), 0) || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                    <ResumoItem label="Total" value={total} highlight />
                    <ResumoItem label="Pago" value={pago} />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-200 dark:border-white/5 pt-5">
                  {agendamento.status === 'confirmado' && (
                    <ActionButton onClick={() => handleStatus(agendamento.id, 'em_atendimento')} label="Iniciar" />
                  )}
                  {agendamento.status === 'em_atendimento' && (
                    <ActionButton onClick={() => handleStatus(agendamento.id, 'concluido')} label="Concluir" />
                  )}
                  {agendamento.status !== 'cancelado' && (
                    <ActionButton variant="secondary" onClick={() => handleStatus(agendamento.id, 'cancelado')} label="Cancelar" />
                  )}
                  {agendamento.status !== 'cancelado' && (
                    <ActionButton variant="secondary" onClick={() => openPagamento(agendamento)} label="Pagamento" />
                  )}
                  <ActionButton variant="danger" onClick={() => handleDelete(agendamento.id)} label="Excluir" icon={<Trash2 size={13} />} />
                </div>
              </article>
            );
          })}
      </div>

      <AnimatePresence>
        {pagamentoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-md sm:p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[2.4rem] border border-gray-200 bg-[#231b22] p-4 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.92)] custom-scrollbar dark:border-white/5 sm:p-6 md:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="brand-kicker">Fechamento</p>
                  <h2 className="mt-2 text-3xl font-brand-display text-gray-900 dark:text-white">Registrar pagamento</h2>
                  <p className="mt-2 text-sm text-gray-200 dark:text-white/52">{pagamentoModal.clienteNome} · {formatDateBR(pagamentoModal.data)}</p>
                </div>
                <button onClick={() => setPagamentoModal(null)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-gray-900 dark:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <ResumoItem label="Total" value={totalDevido} highlight />
                <ResumoItem label="Lançado" value={totalPago} />
                <ResumoItem label="Troco" value={troco} />
              </div>

              <div className="mt-6 space-y-3">
                {pagamentos.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white/[0.03] p-4 md:grid-cols-[170px_minmax(0,1fr)_auto]">
                    <select
                      value={item.forma}
                      onChange={(event) => updatePagamento(index, 'forma', event.target.value)}
                      className="rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
                    >
                      {FORMAS.map((forma) => (
                        <option key={forma.id} value={forma.id}>
                          {forma.id}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      value={item.valor}
                      onChange={(event) => updatePagamento(index, 'valor', event.target.value)}
                      placeholder="Valor"
                      className="rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
                    />

                    <button
                      onClick={() => removePagamento(index)}
                      disabled={pagamentos.length === 1}
                      className="rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/66 disabled:opacity-35"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={addPagamento} className="rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/76">
                  Adicionar forma
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InputMoney label="Taxa da operadora" value={taxaOperadora} onChange={setTaxaOperadora} />
                <InputMoney label="Valor recebido em dinheiro" value={valorRecebido} onChange={setValorRecebido} />
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row">
                <ActionButton variant="secondary" onClick={() => setPagamentoModal(null)} label="Cancelar" />
                <ActionButton onClick={confirmPagamento} label="Confirmar pagamento" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResumoItem({ label, value, highlight = false }) {
  return (
    <div className={cn('rounded-[1.5rem] border px-4 py-4', highlight ? 'border-[#e29ba8]/22 bg-[#e29ba8]/08' : 'border-gray-200 dark:border-white/5 bg-white/[0.03]')}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">{label}</p>
      <p className={cn('mt-2 text-xl font-semibold', highlight ? 'text-[#f3c7cd]' : 'text-gray-900 dark:text-white')}>
        {Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}

function ActionButton({ onClick, label, variant = 'primary', icon }) {
  const variants = {
    primary: 'bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] text-white',
    secondary: 'border border-gray-200 dark:border-white/5 bg-white/[0.04] text-gray-600 dark:text-white/74',
    danger: 'border border-red-300/16 bg-red-400/10 text-red-200',
  };

  return (
    <button onClick={onClick} className={cn('inline-flex items-center justify-center gap-2 rounded-[1.1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]', variants[variant])}>
      {icon}
      {label}
    </button>
  );
}

function InputMoney({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
      />
    </div>
  );
}
