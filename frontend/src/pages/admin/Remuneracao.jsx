import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Landmark,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import {
  createLancamentoRemuneracao,
  getCaixaStatusPagamento,
  getProfissionais,
  getRelatorioRemuneracao,
  updateComissaoPaga,
} from '../../services/api';
import { calculateAgendamentoTotal, cn } from '../../lib/utils';

const FORM_INICIAL = {
  profissionalId: '',
  tipo: 'adiantamento',
  origem: 'caixa',
  valor: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  descricao: '',
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function getSaldoAberto(lancamento) {
  return Math.max(0, Number(lancamento?.saldoAberto ?? (Number(lancamento?.valor || 0) - Number(lancamento?.valorCompensado || 0))));
}

function getDinheiroDisponivelCaixa(caixaStatus) {
  return Number(caixaStatus?.dinheiroDisponivel || 0);
}

function buildAgendamentoTotal(agendamento) {
  return calculateAgendamentoTotal(agendamento);
}

function LancamentoModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
  profissionais,
  saving,
  isScopedProfessional,
  myPid,
  caixaStatus,
  loadingCaixaStatus,
}) {
  if (!open) return null;

  const dinheiroDisponivelCaixa = getDinheiroDisponivelCaixa(caixaStatus);
  const valorLancamento = Number(form.valor || 0);
  const caixaDisponivelParaLancamento = !!caixaStatus?.permiteSaida;
  const valorExcedeCaixa = form.tipo === 'adiantamento' && form.origem === 'caixa' && valorLancamento > dinheiroDisponivelCaixa;
  const bloquearSalvar = saving
    || (form.tipo === 'adiantamento' && form.origem === 'caixa' && (loadingCaixaStatus || !caixaDisponivelParaLancamento || valorExcedeCaixa));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#18181b] shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 px-6 py-4">
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">Lançamentos de Repasse</span>
              <h2 className="mt-0.5 font-serif text-lg font-normal text-gray-900 dark:text-white">
                {form.tipo === 'bonificacao' ? 'Nova Bonificação' : 'Novo Vale ou Desconto'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Profissional">
                <select
                  value={form.profissionalId}
                  disabled={isScopedProfessional}
                  onChange={(event) => setForm((prev) => ({ ...prev, profesionalId: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3.5 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                >
                  <option value="">Selecione o profissional...</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Data do Lançamento">
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2"
                />
              </Field>

              <Field label="Tipo do Lançamento">
                <select
                  value={form.tipo}
                  onChange={(event) => {
                    const nextTipo = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      tipo: nextTipo,
                      origem: nextTipo === 'adiantamento'
                        ? (caixaDisponivelParaLancamento ? (prev.origem || 'caixa') : 'conta')
                        : '',
                    }));
                  }}
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3.5 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2"
                >
                  <option value="adiantamento">Vale / Adiantamento</option>
                  <option value="desconto">Desconto Administrativo</option>
                  {localStorage.getItem('salao_user_role')?.toLowerCase() === 'admin' && (
                    <option value="bonificacao">Bonificação Extra</option>
                  )}
                </select>
              </Field>

              <Field label="Valor (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2"
                  placeholder="0,00"
                />
              </Field>

              {form.tipo === 'adiantamento' && (
                <div className="md:col-span-2 space-y-1.5">
                  <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">Fonte de Saída</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, origem: 'caixa' }))}
                      disabled={loadingCaixaStatus || !caixaDisponivelParaLancamento}
                      className={cn(
                        'h-11 rounded-xl border text-xs font-semibold transition disabled:opacity-40',
                        form.origem === 'caixa'
                          ? 'border-[#d48997] bg-[#d48997]/10 text-[#d48997]'
                          : 'border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] text-gray-500'
                      )}
                    >
                      Caixa Físico
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, origem: 'conta' }))}
                      className={cn(
                        'h-11 rounded-xl border text-xs font-semibold transition',
                        form.origem === 'conta'
                          ? 'border-[#d48997] bg-[#d48997]/10 text-[#d48997]'
                          : 'border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] text-gray-500'
                      )}
                    >
                      Conta Bancária
                    </button>
                  </div>

                  <div
                    className={cn(
                      'mt-2 rounded-xl border px-3 py-2 text-xs font-medium',
                      valorExcedeCaixa || (!loadingCaixaStatus && !caixaDisponivelParaLancamento)
                        ? 'border-amber-300/20 bg-amber-400/5 text-amber-600 dark:text-amber-400'
                        : 'border-[#d48997]/20 bg-[#d48997]/5 text-[#d48997]'
                    )}
                  >
                    {loadingCaixaStatus
                      ? 'Consultando saldo operacional...'
                      : valorExcedeCaixa
                        ? `Saldo insuficiente no caixa. Disponível agora: ${formatMoney(dinheiroDisponivelCaixa)}.`
                        : !caixaDisponivelParaLancamento
                          ? (caixaStatus?.mensagemSaida || 'Caixa fechado ou indisponível. Utilize a opção Conta Bancária.')
                          : `Saldo disponível no caixa físico: ${formatMoney(dinheiroDisponivelCaixa)}.`}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <Field label="Descrição / Observação">
                  <textarea
                    value={form.descricao}
                    onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 resize-none"
                    placeholder={form.tipo === 'bonificacao' ? 'Ex: Bônus por meta batida, bonificação especial...' : 'Ex: Vale adiantado, desconto por quebra de material...'}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={bloquearSalvar}
              onClick={() => onSave(isScopedProfessional ? { ...form, profissionalId: myPid } : form)}
              className="h-10 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] px-5 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              {saving ? 'Registrando...' : form.tipo === 'bonificacao' ? 'Confirmar Bônus' : 'Registrar Lançamento'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value, tone = 'default', icon }) {
  const toneClasses = {
    default: 'border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] text-gray-900 dark:text-white',
    rose: 'border-[#d48997]/25 bg-[#d48997]/5 text-[#d48997]',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    ink: 'border-transparent bg-zinc-900 dark:bg-zinc-800 text-white',
  };

  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm backdrop-blur-md', toneClasses[tone])}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        {icon && React.cloneElement(icon, { size: 16, className: 'opacity-70' })}
      </div>
      <p className="mt-2.5 text-xl font-semibold">{formatMoney(value)}</p>
    </div>
  );
}

export default function Remuneracao() {
  const role = localStorage.getItem('salao_user_role');
  const myPid = localStorage.getItem('salao_user_pid');
  const isScopedProfessional = String(role).toLowerCase() === 'profissional' && !!myPid;

  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-01'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [profissionalId, setProfissionalId] = useState(isScopedProfessional ? myPid : '');
  const [profissionais, setProfissionais] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedProfs, setExpandedProfs] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [savingLancamento, setSavingLancamento] = useState(false);
  const [formLancamento, setFormLancamento] = useState(FORM_INICIAL);
  const [caixaStatus, setCaixaStatus] = useState(null);
  const [loadingCaixaStatus, setLoadingCaixaStatus] = useState(false);

  useEffect(() => {
    fetchProfissionais();
    if (isScopedProfessional) {
      setProfissionalId(myPid);
      setFormLancamento((prev) => ({ ...prev, profissionalId: myPid }));
    }
  }, []);

  useEffect(() => {
    fetchDados();
  }, [dataInicio, dataFim, profissionalId]);

  useEffect(() => {
    if (!showModal) return;
    fetchCaixaStatus();
  }, [showModal]);

  async function fetchProfissionais() {
    try {
      const res = await getProfissionais();
      const ativos = (res.data || []).filter((item) => item.ativo !== false);
      if (isScopedProfessional) {
        setProfissionais(ativos.filter(p => p.id === myPid));
      } else {
        setProfissionais(ativos);
      }
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar os profissionais.');
    }
  }

  async function fetchDados() {
    setLoading(true);
    try {
      const res = await getRelatorioRemuneracao({
        inicio: dataInicio,
        fim: dataFim,
        profissionalId: profissionalId || undefined,
      });
      setAgendamentos(res.data?.agendamentos || []);
      setLancamentos(res.data?.lancamentos || []);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar a remuneração.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCaixaStatus() {
    setLoadingCaixaStatus(true);
    try {
      const res = await getCaixaStatusPagamento();
      const status = res.data || null;
      setCaixaStatus(status);

      if (status && !status.permiteSaida) {
        setFormLancamento((prev) => (
          prev.tipo === 'adiantamento' && prev.origem === 'caixa'
            ? { ...prev, origem: 'conta' }
            : prev
        ));
      }

      return status;
    } catch (err) {
      console.error(err);
      setCaixaStatus(null);
      setFormLancamento((prev) => (
        prev.tipo === 'adiantamento' && prev.origem === 'caixa'
          ? { ...prev, origem: 'conta' }
          : prev
      ));
      return null;
    } finally {
      setLoadingCaixaStatus(false);
    }
  }

  async function handleSalvarLancamento(payload) {
    if (!payload.profissionalId) {
      toast.error('Selecione o profissional.');
      return;
    }

    if (payload.tipo === 'adiantamento' && payload.origem === 'caixa') {
      const statusAtual = await fetchCaixaStatus();
      const dinheiroDisponivel = getDinheiroDisponivelCaixa(statusAtual);

      if (!statusAtual?.permiteSaida) {
        toast.error(statusAtual?.mensagemSaida || 'Caixa indisponível para este lançamento. Use a opção Conta.');
        setFormLancamento((prev) => ({ ...prev, origem: 'conta' }));
        return;
      }

      if (Number(payload.valor || 0) > dinheiroDisponivel) {
        toast.error(`Saldo insuficiente no caixa. Disponível agora: ${formatMoney(dinheiroDisponivel)}.`);
        return;
      }
    }

    setSavingLancamento(true);
    try {
      await createLancamentoRemuneracao(payload);
      toast.success('Lançamento registrado com sucesso.');
      setShowModal(false);
      setFormLancamento({
        ...FORM_INICIAL,
        profissionalId: isScopedProfessional ? myPid : (profissionalId || ''),
      });
      fetchDados();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Não foi possível registrar o lançamento.');
    } finally {
      setSavingLancamento(false);
    }
  }

  async function handleMarcarPago(ids, profId) {
    if (!ids?.length) return;

    setProcessingId(profId);
    try {
      const res = await updateComissaoPaga({ ids, paga: true, profissionalId: profId });
      const valorLiquido = Number(res.data?.valorLiquidoRepasse || 0);
      const valorCompensado = Number(res.data?.totalCompensado || 0);
      toast.success(
        `Fechamento concluído. Líquido ${formatMoney(valorLiquido)}${valorCompensado > 0 ? ` e compensado ${formatMoney(valorCompensado)}` : ''}.`
      );
      fetchDados();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar status de pagamento.');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  }

  const groupedData = useMemo(() => {
    const grouped = {};

    function ensureProfissional(profId, profissional) {
      const fallbackProf = profissionais.find((item) => item.id === profId);
      const profData = profissional || fallbackProf || {};

      if (!grouped[profId]) {
        grouped[profId] = {
          id: profId,
          nome: profData.nome || 'Sem profissional',
          fotoUrl: profData.fotoUrl || null,
          pix: profData.pix || null,
          metaMensal: Number(profData.metaMensal || 0),
          bonusMetaValor: Number(profData.bonusMetaValor || 0),
          bonusMetaPercent: Number(profData.bonusMetaPercent || 0),
          totalBruto: 0,
          totalComissao: 0,
          totalPendente: 0,
          totalVales: 0,
          totalDescontos: 0,
          totalBonificacoes: 0,
          totalSaldo: 0,
          bonusEstimado: 0,
          atendimentos: 0,
          dias: {},
          lancamentos: [],
        };
      }

      return grouped[profId];
    }

    agendamentos.forEach((agendamento) => {
      const profId = agendamento.profissionalId;
      const prof = ensureProfissional(profId, agendamento.profissional);
      const dateKey = String(agendamento.data || '').split('T')[0];
      const totalAgendamento = buildAgendamentoTotal(agendamento);

      if (!prof.dias[dateKey]) {
        prof.dias[dateKey] = {
          data: dateKey,
          bruto: 0,
          comissao: 0,
          agendamentos: [],
        };
      }

      prof.totalBruto += totalAgendamento;
      prof.totalComissao += Number(agendamento.comissaoValor || 0);
      if (!agendamento.comissaoPaga) {
        prof.totalPendente += Number(agendamento.comissaoValor || 0);
      }
      prof.atendimentos += 1;

      prof.dias[dateKey].bruto += totalAgendamento;
      prof.dias[dateKey].comissao += Number(agendamento.comissaoValor || 0);
      prof.dias[dateKey].agendamentos.push(agendamento);
    });

    lancamentos.forEach((lancamento) => {
      const profId = lancamento.profissionalId;
      const prof = ensureProfissional(profId, lancamento.profissional);
      const saldoAberto = getSaldoAberto(lancamento);

      if (lancamento.tipo === 'adiantamento') {
        prof.totalVales += saldoAberto;
      } else if (lancamento.tipo === 'desconto') {
        prof.totalDescontos += saldoAberto;
      } else if (lancamento.tipo === 'bonificacao') {
        prof.totalBonificacoes += saldoAberto;
      }

      prof.lancamentos.push({
        ...lancamento,
        saldoAberto,
      });
    });

    Object.values(grouped).forEach((prof) => {
      if (Number(prof.metaMensal || 0) > 0 && prof.totalBruto >= Number(prof.metaMensal || 0)) {
        prof.bonusEstimado = Number(prof.bonusMetaValor || 0) + ((prof.totalBruto * Number(prof.bonusMetaPercent || 0)) / 100);
      }
      prof.totalSaldo = prof.totalPendente + prof.totalBonificacoes - prof.totalVales - prof.totalDescontos;
      prof.lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
    });

    return grouped;
  }, [agendamentos, lancamentos, profissionais]);

  const profissionaisAgrupados = useMemo(
    () => Object.values(groupedData).sort((a, b) => b.totalSaldo - a.totalSaldo),
    [groupedData]
  );

  const resumoGeral = useMemo(() => {
    return profissionaisAgrupados.reduce((acc, prof) => {
      acc.totalBruto += Number(prof.totalBruto || 0);
      acc.totalPendente += Number(prof.totalPendente || 0);
      acc.totalVales += Number(prof.totalVales || 0);
      acc.totalDescontos += Number(prof.totalDescontos || 0);
      acc.totalBonificacoes += Number(prof.totalBonificacoes || 0);
      acc.totalSaldo += Number(prof.totalSaldo || 0);
      return acc;
    }, {
      totalBruto: 0,
      totalPendente: 0,
      totalVales: 0,
      totalDescontos: 0,
      totalBonificacoes: 0,
      totalSaldo: 0,
    });
  }, [profissionaisAgrupados]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-8 pb-20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Users className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Repasses & Comissões</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Gestão de <span className="text-[#d48997]">Remuneração</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Acompanhe o faturamento, vales, comissões pendentes e realize o fechamento do repasse financeiro de sua equipe.
          </p>
        </div>

        {!isScopedProfessional && (
          <div className="flex flex-wrap gap-2.5">
            {role?.toLowerCase() === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setFormLancamento((prev) => ({
                    ...prev,
                    tipo: 'bonificacao',
                    profissionalId: profissionalId || prev.profissionalId,
                    data: format(new Date(), 'yyyy-MM-dd'),
                  }));
                  setShowModal(true);
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-xs font-semibold shadow-sm transition"
              >
                <PlusCircle size={15} />
                Bonificar
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setFormLancamento((prev) => ({
                  ...prev,
                  tipo: 'adiantamento',
                  profissionalId: profissionalId || prev.profissionalId,
                  data: format(new Date(), 'yyyy-MM-dd'),
                }));
                setShowModal(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-4 text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle size={15} />
              Novo Vale / Desconto
            </button>
          </div>
        )}
      </header>

      {/* Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Comissão Pendente" value={resumoGeral.totalPendente} tone="rose" icon={<DollarSign />} />
        <SummaryCard label="Vales em Aberto" value={resumoGeral.totalVales} tone="amber" icon={<Wallet />} />
        <SummaryCard label="Descontos Acumulados" value={resumoGeral.totalDescontos} tone="amber" icon={<MinusCircle />} />
        <SummaryCard label="Bonificações Extras" value={resumoGeral.totalBonificacoes} tone="default" icon={<PlusCircle className="text-emerald-500" />} />
        <SummaryCard label="Saldo Líquido" value={resumoGeral.totalSaldo} tone={resumoGeral.totalSaldo >= 0 ? 'default' : 'rose'} icon={<CreditCard />} />
        <SummaryCard label="Faturamento Total" value={resumoGeral.totalBruto} tone="ink" icon={<Users />} />
      </div>

      {/* Filter Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] p-4 shadow-sm space-y-1.5">
          <label className="block text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Período Inicial</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d48997] h-4 w-4" />
            <input
              type="date"
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              className="h-10 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-9 pr-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] transition-all"
            />
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] p-4 shadow-sm space-y-1.5">
          <label className="block text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Período Final</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d48997] h-4 w-4" />
            <input
              type="date"
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              className="h-10 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-9 pr-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] transition-all"
            />
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] p-4 shadow-sm space-y-1.5">
          <label className="block text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Filtrar Profissional</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d48997] h-4 w-4" />
            <select
              disabled={isScopedProfessional}
              value={profissionalId}
              onChange={(event) => setProfissionalId(event.target.value)}
              className="h-10 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-9 pr-4 text-xs text-gray-900 dark:text-white outline-none focus:border-[#d48997] transition-all"
            >
              <option value="">Todos os profissionais</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
            <p className="text-xs text-gray-400">Carregando dados de remuneração...</p>
          </div>
        ) : profissionaisAgrupados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.01] px-6 py-12 text-center text-xs">
            <p className="font-semibold text-gray-800 dark:text-gray-200">Nenhum Registro Encontrado</p>
            <p className="mt-1 text-gray-400 dark:text-gray-500">Não há comissões ou vales lançados no período selecionado.</p>
          </div>
        ) : (
          profissionaisAgrupados.map((prof) => {
            const idsPendentes = agendamentos
              .filter((item) => item.profissionalId === prof.id && !item.comissaoPaga)
              .map((item) => item.id);

            return (
              <motion.div
                key={prof.id}
                layout
                className="overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md shadow-sm"
              >
                {/* Accordion Trigger */}
                <div
                  onClick={() => setExpandedProfs((prev) => ({ ...prev, [prof.id]: !prev[prof.id] }))}
                  className="flex cursor-pointer flex-col gap-4 p-5 transition hover:bg-black/[0.01] dark:hover:bg-white/[0.01] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-black/[0.06] bg-gray-50 dark:bg-zinc-800 dark:border-white/5 text-sm font-semibold uppercase text-gray-400">
                        {prof.fotoUrl ? <img src={prof.fotoUrl} alt={prof.nome} className="h-full w-full object-cover" /> : prof.nome.slice(0, 2)}
                      </div>
                      <div
                        className={cn(
                          'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white text-white dark:border-zinc-900',
                          prof.totalSaldo < 0 ? 'bg-amber-500' : 'bg-[#d48997]'
                        )}
                      >
                        {prof.totalSaldo < 0 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{prof.nome}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-lg bg-[#d48997]/10 px-2 py-0.5 text-[9px] font-semibold text-[#d48997]">
                          {prof.atendimentos} atendimentos
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-black/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[9px] font-medium text-gray-500 dark:text-gray-400">
                          {Object.keys(prof.dias).length} dias ativos
                        </span>
                        {prof.totalVales > 0 && (
                          <span className="inline-flex items-center rounded-lg bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                            Vale em aberto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">Saldo Líquido</span>
                      <span className={cn('text-lg font-bold tracking-tight block mt-0.5', prof.totalSaldo >= 0 ? 'text-[#d48997]' : 'text-amber-500')}>
                        {formatMoney(prof.totalSaldo)}
                      </span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={cn('text-gray-400 transition-transform duration-200 shrink-0', expandedProfs[prof.id] && 'rotate-180')}
                    />
                  </div>
                </div>

                {/* Accordion Content */}
                <AnimatePresence>
                  {expandedProfs[prof.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-black/[0.03] dark:border-white/5"
                    >
                      <div className="p-5 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 text-xs">
                          <SummaryCard label="Comissão" value={prof.totalPendente} tone="rose" icon={<DollarSign />} />
                          <SummaryCard label="Vales" value={prof.totalVales} tone="amber" icon={<Wallet />} />
                          <SummaryCard label="Descontos" value={prof.totalDescontos} tone="amber" icon={<MinusCircle />} />
                          <SummaryCard label="Bônus Extra" value={prof.totalBonificacoes} tone="default" icon={<PlusCircle className="text-emerald-500" />} />
                          <SummaryCard label="Líquido Real" value={prof.totalSaldo} tone={prof.totalSaldo >= 0 ? 'default' : 'rose'} icon={<CreditCard />} />
                        </div>

                        {/* Meta & Pix info */}
                        <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 text-xs">
                          <div className="grid gap-4 sm:grid-cols-3">
                            <InfoLine label="PIX do Colaborador" value={prof.pix || 'Não cadastrado'} />
                            <InfoLine label="Meta de Faturamento" value={prof.metaMensal > 0 ? formatMoney(prof.metaMensal) : 'Sem meta configurada'} />
                            <InfoLine label="Bônus Estimado" value={formatMoney(prof.bonusEstimado)} />
                          </div>
                        </div>

                        {/* Commissions List */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-black/[0.03] dark:border-white/5 pb-2">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Histórico de Atendimentos</h4>
                            <span className="text-[10px] font-medium text-gray-400">{prof.atendimentos} registros</span>
                          </div>

                          {Object.keys(prof.dias).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] py-8 text-center text-xs text-gray-400">
                              Sem atendimentos no período.
                            </div>
                          ) : (
                            Object.values(prof.dias)
                              .sort((a, b) => b.data.localeCompare(a.data))
                              .map((dia) => (
                                <div key={dia.data} className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#18181b]/50 p-4 space-y-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-black/[0.03] dark:border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="text-[#d48997] h-4 w-4" />
                                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-250">
                                        {format(parseISO(dia.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3.5 text-[10px] text-gray-400">
                                      <span>Produção: <strong>{formatMoney(dia.bruto)}</strong></span>
                                      <span className="text-[#d48997]">Comissão: <strong>{formatMoney(dia.comissao)}</strong></span>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto text-[11px]">
                                    <table className="w-full min-w-[700px] text-left">
                                      <thead>
                                        <tr className="text-gray-400 dark:text-gray-500">
                                          <th className="py-2 font-medium">Horário</th>
                                          <th className="py-2 font-medium">Cliente</th>
                                          <th className="py-2 font-medium">Serviço / Pacote</th>
                                          <th className="py-2 font-medium text-right">Valor Total</th>
                                          <th className="py-2 font-medium text-right">Comissão Devida</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                        {dia.agendamentos.map((agendamento) => (
                                          <tr key={agendamento.id} className="text-gray-700 dark:text-gray-300">
                                            <td className="py-2.5 text-gray-400 font-medium">{agendamento.inicioHora}</td>
                                            <td className="py-2.5">
                                              <p className="font-semibold text-gray-800 dark:text-gray-200">{agendamento.clienteNome}</p>
                                              <p className="text-[10px] text-gray-400 mt-0.5">{agendamento.clienteTelefone}</p>
                                            </td>
                                            <td className="py-2.5 text-gray-600 dark:text-zinc-400">
                                              {agendamento.servico?.nome || agendamento.pacote?.nome || 'Serviço'}
                                            </td>
                                            <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-250">
                                              {formatMoney(buildAgendamentoTotal(agendamento))}
                                            </td>
                                            <td className="py-2.5 text-right">
                                              <div className="inline-flex items-center gap-1.5">
                                                <span className="font-semibold text-[#d48997]">
                                                  {formatMoney(agendamento.comissaoValor)}
                                                </span>
                                                <CheckCircle2
                                                  size={13}
                                                  className={cn(agendamento.comissaoPaga ? 'text-[#d48997]' : 'text-gray-200 dark:text-zinc-700')}
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>

                        {/* Adjustments / Vales list */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-black/[0.03] dark:border-white/5 pb-2">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Vales, Descontos & Bonificações</h4>
                            <span className="text-[10px] font-medium text-gray-400">{prof.lancamentos.length} lançamentos</span>
                          </div>

                          {prof.lancamentos.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] py-8 text-center text-xs text-gray-400">
                              Nenhum adiantamento ou desconto ativo.
                            </div>
                          ) : (
                            <div className="overflow-x-auto text-[11px] rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#18181b]/50">
                              <table className="w-full min-w-[760px] text-left">
                                <thead>
                                  <tr className="border-b border-black/[0.03] dark:border-white/5 text-gray-400 dark:text-gray-500">
                                    <th className="px-4 py-3 font-medium">Data</th>
                                    <th className="px-4 py-3 font-medium">Tipo</th>
                                    <th className="px-4 py-3 font-medium">Origem</th>
                                    <th className="px-4 py-3 font-medium text-right">Valor Original</th>
                                    <th className="px-4 py-3 font-medium text-right">Compensado</th>
                                    <th className="px-4 py-3 font-medium text-right">Saldo Aberto</th>
                                    <th className="px-4 py-3 font-medium">Observação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prof.lancamentos.map((lancamento) => (
                                    <tr key={lancamento.id} className="text-gray-700 dark:text-gray-300 border-b border-black/[0.02] dark:border-white/[0.02] hover:bg-black/[0.005]">
                                      <td className="px-4 py-3 font-medium text-gray-400">
                                        {format(new Date(lancamento.data), 'dd/MM/yyyy')}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className={cn(
                                            'inline-flex items-center rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                                            lancamento.tipo === 'adiantamento'
                                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                              : lancamento.tipo === 'desconto'
                                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                          )}
                                        >
                                          {lancamento.tipo === 'adiantamento' ? 'Vale' : lancamento.tipo === 'desconto' ? 'Desconto' : 'Bônus'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-500">{lancamento.origem === 'caixa' ? 'Caixa Físico' : lancamento.origem === 'conta' ? 'Conta Bancária' : '-'}</td>
                                      <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{formatMoney(lancamento.valor)}</td>
                                      <td className="px-4 py-3 text-right text-gray-400">{formatMoney(lancamento.valorCompensado)}</td>
                                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                        <span className={cn(lancamento.tipo === 'bonificacao' ? 'text-emerald-500' : 'text-gray-900 dark:text-white')}>
                                          {formatMoney(lancamento.saldoAberto)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-400 truncate max-w-[180px]">{lancamento.descricao || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Actions line */}
                        <div className="flex flex-col gap-4 rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Quitar / Fechar Repasse</h5>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              Ao confirmar, as comissões pendentes serão quitadas e o sistema liquidará automaticamente os vales e descontos em aberto.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={prof.totalPendente === 0 || processingId === prof.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMarcarPago(idsPendentes, prof.id);
                            }}
                            className={cn(
                              'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-5 text-xs font-semibold transition',
                              prof.totalPendente === 0
                                ? 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                                : 'bg-[#d48997] hover:bg-[#c97b8a] text-white shadow-sm'
                            )}
                          >
                            {processingId === prof.id ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : <CheckCircle2 size={14} />}
                            {prof.totalPendente === 0 ? 'Sem repasses pendentes' : 'Confirmar Fechamento'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      <LancamentoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSalvarLancamento}
        form={formLancamento}
        setForm={setFormLancamento}
        profissionais={profissionais}
        saving={savingLancamento}
        isScopedProfessional={isScopedProfessional}
        myPid={myPid}
        caixaStatus={caixaStatus}
        loadingCaixaStatus={loadingCaixaStatus}
      />
    </motion.div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#18181b] p-4 shadow-sm text-xs">
      <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{label}</span>
      <span className="mt-1 font-semibold text-gray-800 dark:text-gray-250 block">{value}</span>
    </div>
  );
}
