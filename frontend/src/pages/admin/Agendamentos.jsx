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
  getCaixaStatusPagamento,
  reabrirComandaAgendamento,
  updatePagamentoAgendamento,
  updateStatusAgendamento,
} from '../../services/api';
import {
  calculateAgendamentoDuration,
  calculateGroupedAgendamentosTotal,
  calculateAgendamentoTotal,
  cn,
  formatDateBR,
  formatDurationLabel,
  getAgendamentosMesmoClienteNoDia,
  getAgendamentoBasePrice,
  getAgendamentoOriginalBasePrice,
  hasAgendamentoAdjustedBasePrice,
} from '../../lib/utils';

const STATUS_CONFIG = {
  confirmado: {
    label: 'Confirmado',
    tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25',
    icon: Clock,
  },
  em_atendimento: {
    label: 'Em atendimento',
    tone: 'bg-[#fdf2f5] text-[#b84c6b] border-[#eccbd4] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8] dark:border-[#c65d7b]/30',
    icon: Scissors,
  },
  concluido: {
    label: 'Concluído',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25',
    icon: XCircle,
  },
};

const FORMAS = [
  { id: 'PIX', icon: Smartphone },
  { id: 'Cartao de Credito', icon: CreditCard },
  { id: 'Cartao de Debito', icon: CreditCard },
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
  const [valorBaseAjustado, setValorBaseAjustado] = useState('');
  const [taxaOperadora, setTaxaOperadora] = useState('0');
  const [valorRecebido, setValorRecebido] = useState('');
  const [caixaPagamentoStatus, setCaixaPagamentoStatus] = useState({ aberto: true, mensagem: '' });

  useEffect(() => {
    loadAgendamentos();
  }, [filtroData, filtroStatus]);

  useEffect(() => {
    loadCaixaPagamentoStatus();
  }, []);

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

  async function loadCaixaPagamentoStatus() {
    try {
      const response = await getCaixaStatusPagamento();
      setCaixaPagamentoStatus({
        aberto: !!response.data?.aberto,
        mensagem: response.data?.mensagem || '',
      });
    } catch {
      setCaixaPagamentoStatus({
        aberto: true,
        mensagem: '',
      });
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
    return calculateAgendamentoTotal(agendamento);
  }

  function calcPago(agendamento) {
    return agendamento.pagamentos?.reduce((sum, item) => sum + Number(item.valor || 0), 0) || 0;
  }

  function openPagamento(agendamento) {
    const grupo = getAgendamentosMesmoClienteNoDia(agendamentos, agendamento).filter(
      (item) => item.statusPagamento !== 'pago'
    );
    const total = grupo.length ? calculateGroupedAgendamentosTotal(grupo) : calcTotal(agendamento);
    loadCaixaPagamentoStatus();
    setPagamentoModal(agendamento);
    setPagamentos([{ forma: 'PIX', valor: total.toFixed(2) }]);
    setValorBaseAjustado(getAgendamentoBasePrice(agendamento).toFixed(2));
    setTaxaOperadora('0');
    setValorRecebido('');
  }

  async function handleReabrir(agendamento) {
    const grupo = getAgendamentosMesmoClienteNoDia(agendamentos, agendamento).filter(
      (item) =>
        item.statusPagamento === 'pago' ||
        (item.pagamentos || []).length > 0 ||
        item.status === 'concluido'
    );

    if (!window.confirm('Deseja reabrir esta comanda para ajustes?')) return;

    try {
      await reabrirComandaAgendamento(agendamento.id, {
        agendamentoIds: (grupo.length ? grupo : [agendamento]).map((item) => item.id),
      });
      await loadAgendamentos();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Não foi possível reabrir a comanda.');
    }
  }

  function updatePagamento(index, field, value) {
    setPagamentos((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item))
    );
  }

  function addPagamento() {
    setPagamentos((prev) => [...prev, { forma: 'PIX', valor: '' }]);
  }

  function removePagamento(index) {
    setPagamentos((prev) => prev.filter((_, current) => current !== index));
  }

  async function confirmPagamento() {
    if (!pagamentoModal) return;
    if (!valorBaseAjustadoValido) {
      window.alert('Informe um valor válido para o serviço antes de confirmar o pagamento.');
      return;
    }
    if (!caixaPagamentoStatus.aberto) {
      window.alert(caixaPagamentoStatus.mensagem || 'Abra o caixa antes de registrar pagamentos.');
      return;
    }

    try {
      await updatePagamentoAgendamento(pagamentoModal.id, {
        pagamentos: pagamentos.map((item) => ({
          forma: item.forma,
          valor: Number(item.valor || 0),
        })),
        taxaOperadora: Number(taxaOperadora || 0),
        valorBaseAjustado: valorBaseAjustadoAtivo ? valorBaseAjustadoNumero : null,
        valorRecebido: Number(valorRecebido || 0),
        agendamentoIds: (pagamentoModalGrupo.length ? pagamentoModalGrupo : [pagamentoModal]).map(
          (item) => item.id
        ),
      });

      setPagamentoModal(null);
      await loadAgendamentos();
    } catch (error) {
      window.alert(error.response?.data?.error || 'Não foi possível registrar o pagamento.');
    }
  }

  const valorBaseAjustadoNumero = Number(valorBaseAjustado);
  const valorBaseAjustadoValido =
    valorBaseAjustado !== '' &&
    Number.isFinite(valorBaseAjustadoNumero) &&
    valorBaseAjustadoNumero >= 0;
  const precoBaseOriginal = pagamentoModal ? getAgendamentoOriginalBasePrice(pagamentoModal) : 0;
  const valorBaseAjustadoAtivo =
    valorBaseAjustadoValido && Math.abs(valorBaseAjustadoNumero - precoBaseOriginal) >= 0.001;
  const pagamentoModalPreview = pagamentoModal
    ? { ...pagamentoModal, valorBaseAjustado: valorBaseAjustadoAtivo ? valorBaseAjustadoNumero : null }
    : null;
  const pagamentoModalGrupo = pagamentoModal
    ? getAgendamentosMesmoClienteNoDia(agendamentos, pagamentoModal).filter(
        (item) => item.statusPagamento !== 'pago'
      )
    : [];
  const totalDevido = pagamentoModalPreview
    ? pagamentoModalGrupo.length
      ? pagamentoModalGrupo.reduce((sum, item) => {
          if (item.id === pagamentoModalPreview.id) return sum + calcTotal(pagamentoModalPreview);
          return sum + calcTotal(item);
        }, 0)
      : calcTotal(pagamentoModalPreview)
    : 0;
  const totalPago = pagamentos.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const troco = pagamentos.some((item) => item.forma === 'Dinheiro')
    ? Math.max(0, Number(valorRecebido || 0) - totalDevido)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header className="space-y-2 border-b border-[#eae1e4] pb-5 dark:border-[#28212f]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b84c6b]">
          <Calendar className="h-3.5 w-3.5" />
          <span>Histórico de agenda</span>
        </div>
        <h1 className="font-brand-display text-3xl font-bold tracking-[-0.02em] text-[#23141c] dark:text-white sm:text-4xl">
          Agendamentos
        </h1>
        <p className="max-w-2xl text-sm text-[#6b5761] dark:text-white/60">
          Acompanhe atendimentos finalizados, pagamentos recebidos e a linha do tempo operacional de cada reserva.
        </p>
      </header>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-[#eae1e4] bg-white p-4 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c727e]" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar cliente ou telefone..."
            className="h-11 w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] pl-10 pr-4 text-sm text-[#23141c] outline-none placeholder:text-[#8c727e] focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
          />
        </div>

        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b84c6b]" />
          <input
            type="date"
            value={filtroData}
            onChange={(event) => setFiltroData(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] pl-10 pr-3 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
          />
        </div>

        <div className="relative">
          <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c727e]" />
          <select
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-[#e2d5da] bg-[#faf7f5] pl-10 pr-4 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] focus:bg-white dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
          >
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="em_atendimento">Em atendimento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="space-y-3.5">
        {!caixaPagamentoStatus.aberto && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
            {caixaPagamentoStatus.mensagem || 'Abra o caixa antes de registrar pagamentos.'}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#eae1e4] bg-white py-14 dark:border-[#28212f] dark:bg-[#1c1721]">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#eadde1] border-t-[#b84c6b]" />
            <p className="text-xs font-semibold text-[#745e69] dark:text-white/60">
              Carregando agendamentos...
            </p>
          </div>
        )}

        {!loading && filtrados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#e2d5da] bg-white px-6 py-16 text-center text-sm text-[#745e69] dark:border-[#352b3e] dark:bg-[#1c1721] dark:text-white/55">
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
              <article
                key={agendamento.id}
                className="rounded-2xl border border-[#eae1e4] bg-white p-5 shadow-sm transition hover:border-[#c65d7b]/35 dark:border-[#28212f] dark:bg-[#1c1721]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-bold text-[#23141c] dark:text-white">
                        {agendamento.clienteNome}
                      </h2>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold',
                          status.tone
                        )}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#6b5761] dark:text-white/60">
                      <span className="font-semibold text-[#23141c] dark:text-white/85">
                        {formatDateBR(agendamento.data)} · {agendamento.inicioHora}
                      </span>
                      <span>{agendamento.profissional?.nome || 'Sem profissional'}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Phone size={12} className="text-[#b84c6b]" />
                        {agendamento.clienteTelefone}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <span className="rounded-lg bg-[#fdf2f5] px-2.5 py-1 text-xs font-semibold text-[#b84c6b] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]">
                        {agendamento.servico?.nome || agendamento.pacote?.nome || 'Sem serviço principal'}
                      </span>
                      {hasAgendamentoAdjustedBasePrice(agendamento) && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          Valor ajustado
                        </span>
                      )}
                      <span className="rounded-lg bg-[#f6f1f3] px-2.5 py-1 text-xs font-semibold text-[#5b4852] dark:bg-white/10 dark:text-white/70">
                        {formatDurationLabel(calculateAgendamentoDuration(agendamento))}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 lg:min-w-[300px]">
                    <ResumoItem label="Total" value={total} highlight />
                    <ResumoItem label="Pago" value={pago} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f0e8eb] pt-4 dark:border-[#28212f]">
                  {agendamento.status === 'confirmado' && (
                    <ActionButton
                      onClick={() => handleStatus(agendamento.id, 'em_atendimento')}
                      label="Iniciar"
                    />
                  )}
                  {agendamento.status === 'em_atendimento' && (
                    <ActionButton
                      onClick={() => handleStatus(agendamento.id, 'concluido')}
                      label="Concluir"
                    />
                  )}
                  {agendamento.status !== 'cancelado' && (
                    <ActionButton
                      variant="secondary"
                      onClick={() => handleStatus(agendamento.id, 'cancelado')}
                      label="Cancelar"
                    />
                  )}
                  {agendamento.status !== 'cancelado' && (
                    <ActionButton
                      variant="secondary"
                      onClick={() => openPagamento(agendamento)}
                      label="Pagamento"
                      disabled={!caixaPagamentoStatus.aberto}
                    />
                  )}
                  {agendamento.statusPagamento === 'pago' && (
                    <ActionButton
                      variant="secondary"
                      onClick={() => handleReabrir(agendamento)}
                      label="Reabrir comanda"
                    />
                  )}
                  <ActionButton
                    variant="danger"
                    onClick={() => handleDelete(agendamento.id)}
                    label="Excluir"
                    icon={<Trash2 size={13} />}
                  />
                </div>
              </article>
            );
          })}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {pagamentoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#eae1e4] bg-white p-5 shadow-2xl custom-scrollbar dark:border-[#352b3e] dark:bg-[#1c1721] sm:p-7"
            >
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#f0e8eb] pb-4 dark:border-[#28212f]">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
                    Fechamento de comanda
                  </p>
                  <h2 className="mt-1 font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
                    Registrar pagamento
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#6b5761] dark:text-white/60">
                    {pagamentoModal.clienteNome} · {formatDateBR(pagamentoModal.data)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPagamentoModal(null)}
                  className="rounded-xl border border-[#e2d5da] bg-[#faf7f5] p-2 text-[#6b5761] transition hover:text-[#23141c] dark:border-[#352b3e] dark:bg-white/5 dark:text-white/70"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ResumoItem label="Total" value={totalDevido} highlight />
                <ResumoItem label="Lançado" value={totalPago} />
                <ResumoItem label="Troco" value={troco} />
              </div>

              {pagamentoModalGrupo.length > 1 && (
                <div className="mt-5 rounded-2xl border border-[#eae1e4] bg-[#faf7f5] p-4 dark:border-[#28212f] dark:bg-white/[0.03]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
                    Procedimentos agrupados no dia
                  </p>
                  <div className="mt-3 space-y-2">
                    {pagamentoModalGrupo.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#eae1e4] bg-white px-3.5 py-2.5 dark:border-[#28212f] dark:bg-[#1c1721]"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#23141c] dark:text-white">
                            {item.inicioHora} · {item.servico?.nome || item.pacote?.nome || 'Serviço'}
                          </p>
                          <p className="text-[11px] text-[#745e69] dark:text-white/55">
                            {item.profissional?.nome || 'Equipe'}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-[#23141c] tabular-nums dark:text-white">
                          {calcTotal(item).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InputMoney
                  label="Valor do serviço"
                  value={valorBaseAjustado}
                  onChange={setValorBaseAjustado}
                />
                <div className="rounded-2xl border border-[#eae1e4] bg-[#faf7f5] px-4 py-3.5 dark:border-[#28212f] dark:bg-white/[0.03]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
                    Referência original
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[#23141c] tabular-nums dark:text-white">
                    {precoBaseOriginal.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setValorBaseAjustado(precoBaseOriginal.toFixed(2))}
                      className="text-xs font-bold text-[#b84c6b] hover:underline"
                    >
                      Restaurar original
                    </button>
                    {valorBaseAjustadoAtivo && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        Ajustado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {pagamentos.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2.5 rounded-2xl border border-[#eae1e4] bg-[#faf7f5] p-3.5 dark:border-[#28212f] dark:bg-white/[0.03] md:grid-cols-[175px_minmax(0,1fr)_auto]"
                  >
                    <select
                      value={item.forma}
                      onChange={(event) => updatePagamento(index, 'forma', event.target.value)}
                      className="h-10 rounded-xl border border-[#e2d5da] bg-white px-3 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
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
                      className="h-10 rounded-xl border border-[#e2d5da] bg-white px-3.5 text-sm text-[#23141c] outline-none placeholder:text-[#8c727e] focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() => removePagamento(index)}
                      disabled={pagamentos.length === 1}
                      className="h-10 rounded-xl border border-[#e2d5da] bg-white px-3.5 text-xs font-semibold text-[#6b5761] transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-35 dark:border-[#352b3e] dark:bg-white/5 dark:text-white/70"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={addPagamento}
                  className="rounded-xl border border-[#e2d5da] bg-white px-4 py-2 text-xs font-bold text-[#23141c] transition hover:border-[#b84c6b] hover:text-[#b84c6b] dark:border-[#352b3e] dark:bg-white/5 dark:text-white"
                >
                  + Adicionar forma de pagamento
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InputMoney
                  label="Taxa da operadora (R$)"
                  value={taxaOperadora}
                  onChange={setTaxaOperadora}
                />
                <InputMoney
                  label="Valor recebido em dinheiro (R$)"
                  value={valorRecebido}
                  onChange={setValorRecebido}
                />
              </div>

              <div className="mt-6 flex flex-col justify-end gap-2.5 border-t border-[#f0e8eb] pt-4 dark:border-[#28212f] sm:flex-row">
                <ActionButton
                  variant="secondary"
                  onClick={() => setPagamentoModal(null)}
                  label="Cancelar"
                />
                <ActionButton
                  onClick={confirmPagamento}
                  label="Confirmar pagamento"
                  disabled={!caixaPagamentoStatus.aberto || !valorBaseAjustadoValido}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResumoItem({ label, value, highlight = false }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        highlight
          ? 'border-[#eccbd4] bg-[#fdf2f5] dark:border-[#c65d7b]/35 dark:bg-[#c65d7b]/15'
          : 'border-[#eae1e4] bg-[#faf7f5] dark:border-[#28212f] dark:bg-white/[0.03]'
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-lg font-extrabold tabular-nums',
          highlight ? 'text-[#b84c6b] dark:text-[#f0aab8]' : 'text-[#23141c] dark:text-white'
        )}
      >
        {Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}

function ActionButton({ onClick, label, variant = 'primary', icon, disabled = false }) {
  const variants = {
    primary: 'bg-[#b84c6b] hover:bg-[#9c3b57] text-white shadow-sm',
    secondary:
      'border border-[#e2d5da] bg-white text-[#23141c] hover:bg-[#faf7f5] dark:border-[#352b3e] dark:bg-white/5 dark:text-white dark:hover:bg-white/10',
    danger:
      'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition',
        variants[variant],
        disabled && 'cursor-not-allowed opacity-45'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function InputMoney({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#e2d5da] bg-white px-4 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
      />
    </div>
  );
}
