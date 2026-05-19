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
import { cn } from '../../lib/utils';

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
  const precoBase = Number(agendamento?.servico?.preco ?? agendamento?.pacote?.preco ?? 0);
  const precoItens = agendamento?.itens?.reduce((sum, item) => sum + Number(item.preco || 0), 0) || 0;
  const precoProdutos = agendamento?.produtos?.reduce((sum, item) => sum + (Number(item.preco || 0) * Number(item.quantidade || 0)), 0) || 0;
  return precoBase + precoItens + precoProdutos;
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-black/80 p-4 py-6 backdrop-blur-md md:items-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          onClick={(event) => event.stopPropagation()}
          className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-[0_40px_120px_-32px_rgba(0,0,0,0.6)] dark:border-white/5 dark:bg-[#161219] md:max-h-[calc(100vh-3rem)] md:p-8"
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d48997]">Remuneracao</p>
              <h2 className="mt-2 text-3xl font-black tracking-tighter text-gray-900 dark:text-white">Novo vale ou desconto</h2>
              <p className="mt-3 text-sm text-gray-500 dark:text-white/58">
                Registre um adiantamento para o profissional ou um desconto que sera abatido nas proximas comissoes.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 p-3 text-gray-400 transition hover:text-red-500 dark:border-white/10 dark:text-white/60"
            >
              <AlertCircle size={16} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Profissional" icon={<User size={14} />}>
              <select
                value={form.profissionalId}
                disabled={isScopedProfessional}
                onChange={(event) => setForm((prev) => ({ ...prev, profissionalId: event.target.value }))}
                className="h-14 w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">Selecione...</option>
                {profissionais.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data" icon={<CalendarIcon size={14} />}>
              <input
                type="date"
                value={form.data}
                onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
                className="h-14 w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </Field>

            <Field label="Tipo" icon={<Wallet size={14} />}>
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
                className="h-14 w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="adiantamento">Adiantamento / Vale</option>
                <option value="desconto">Desconto</option>
              </select>
            </Field>

            <Field label="Valor" icon={<DollarSign size={14} />}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))}
                className="h-14 w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="0,00"
              />
            </Field>

            {form.tipo === 'adiantamento' && (
              <Field label="Saiu de onde?" icon={<Landmark size={14} />}>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, origem: 'caixa' }))}
                    disabled={loadingCaixaStatus || !caixaDisponivelParaLancamento}
                    className={cn(
                      'h-14 rounded-[1.25rem] border text-sm font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-45',
                      form.origem === 'caixa'
                        ? 'border-[#d48997] bg-[#d48997] text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
                    )}
                  >
                    Caixa
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, origem: 'conta' }))}
                    className={cn(
                      'h-14 rounded-[1.25rem] border text-sm font-black uppercase tracking-[0.16em] transition-all',
                      form.origem === 'conta'
                        ? 'border-[#d48997] bg-[#d48997] text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60'
                    )}
                  >
                    Conta
                  </button>
                </div>

                <div
                  className={cn(
                    'mt-3 rounded-[1.25rem] border px-4 py-3 text-sm',
                    valorExcedeCaixa || (!loadingCaixaStatus && !caixaDisponivelParaLancamento)
                      ? 'border-amber-300/25 bg-amber-400/10 text-amber-200'
                      : 'border-[#d48997]/18 bg-[#d48997]/8 text-[#d48997]'
                  )}
                >
                  {loadingCaixaStatus
                    ? 'Consultando saldo do caixa...'
                    : valorExcedeCaixa
                      ? `Saldo insuficiente no caixa. Disponivel agora: ${formatMoney(dinheiroDisponivelCaixa)}.`
                      : !caixaDisponivelParaLancamento
                        ? (caixaStatus?.mensagemSaida || 'Caixa indisponivel para este lancamento. Use a opcao Conta.')
                        : `Disponivel no caixa agora: ${formatMoney(dinheiroDisponivelCaixa)}.`}
                </div>
              </Field>
            )}

            <div className="md:col-span-2">
              <Field label="Observacao" icon={<CreditCard size={14} />}>
                <textarea
                  value={form.descricao}
                  onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                  rows={4}
                  className="w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="Ex.: vale para urgencia, desconto por quebra de material, etc."
                />
              </Field>
            </div>
          </div>

          <div className="sticky bottom-0 mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 bg-white/95 pt-5 backdrop-blur dark:border-white/5 dark:bg-[#161219]/95 md:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[1.4rem] border border-gray-200 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={bloquearSalvar}
              onClick={() => onSave(isScopedProfessional ? { ...form, profissionalId: myPid } : form)}
              className="flex-1 rounded-[1.4rem] bg-[#d48997] px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-xl shadow-[#d48997]/25 transition hover:bg-[#c77888] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Registrar lancamento'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, icon, children }) {
  return (
    <label className="block space-y-3">
      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value, tone = 'default', icon }) {
  const toneClasses = {
    default: 'border-gray-100 bg-white dark:border-white/5 dark:bg-white/[0.03] text-gray-900 dark:text-white',
    rose: 'border-[#d48997]/20 bg-[#d48997]/10 text-[#d48997]',
    amber: 'border-amber-300/20 bg-amber-400/10 text-amber-200',
    ink: 'border-transparent bg-bellapro-ink text-white',
  };

  return (
    <div className={cn('rounded-[1.8rem] border p-5 shadow-lg', toneClasses[tone])}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-black tracking-tighter">{formatMoney(value)}</p>
    </div>
  );
}

export default function Remuneracao() {
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-01'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [profissionalId, setProfissionalId] = useState('');
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

  const role = localStorage.getItem('salao_user_role');
  const myPid = localStorage.getItem('salao_user_pid');
  const isScopedProfessional = role === 'profissional' && !!myPid;

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
      setProfissionais((res.data || []).filter((item) => item.ativo !== false));
    } catch (err) {
      console.error(err);
      toast.error('Nao foi possivel carregar os profissionais.');
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
      toast.error('Nao foi possivel carregar a remuneracao.');
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
        toast.error(statusAtual?.mensagemSaida || 'Caixa indisponivel para este lancamento. Use a opcao Conta.');
        setFormLancamento((prev) => ({ ...prev, origem: 'conta' }));
        return;
      }

      if (Number(payload.valor || 0) > dinheiroDisponivel) {
        toast.error(`Saldo insuficiente no caixa. Disponivel agora: ${formatMoney(dinheiroDisponivel)}.`);
        return;
      }
    }

    setSavingLancamento(true);
    try {
      await createLancamentoRemuneracao(payload);
      toast.success('Lancamento registrado com sucesso.');
      setShowModal(false);
      setFormLancamento({
        ...FORM_INICIAL,
        profissionalId: isScopedProfessional ? myPid : (profissionalId || ''),
      });
      fetchDados();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Nao foi possivel registrar o lancamento.');
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
        `Fechamento concluido. Liquido ${formatMoney(valorLiquido)}${valorCompensado > 0 ? ` e compensado ${formatMoney(valorCompensado)}` : ''}.`
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
      prof.totalSaldo = prof.totalPendente - prof.totalVales - prof.totalDescontos;
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
      acc.totalSaldo += Number(prof.totalSaldo || 0);
      return acc;
    }, {
      totalBruto: 0,
      totalPendente: 0,
      totalVales: 0,
      totalDescontos: 0,
      totalSaldo: 0,
    });
  }, [profissionaisAgrupados]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl space-y-12 pb-20">
      <header className="relative overflow-hidden rounded-[3rem] border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/5 dark:bg-gray-900/40 md:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d48997]/12 blur-[100px]" />
        <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-[#d48997]">Consolidado financeiro</p>
            <h1 className="mt-4 text-3xl font-black tracking-tighter text-gray-900 dark:text-white sm:text-5xl">
              Remuneracao, vales e saldo por profissional
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-500 dark:text-white/58">
              Controle comissao a receber, adiantamentos, descontos e o saldo real de repasse. Quando o vale sair do caixa, o sistema tambem abate no caixa operacional.
            </p>
          </div>

          {!isScopedProfessional && (
            <button
              type="button"
              onClick={() => {
                setFormLancamento((prev) => ({
                  ...prev,
                  profissionalId: profissionalId || prev.profissionalId,
                  data: format(new Date(), 'yyyy-MM-dd'),
                }));
                setShowModal(true);
              }}
              className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-[#d48997] px-7 text-sm font-black uppercase tracking-[0.24em] text-white shadow-xl shadow-[#d48997]/25 transition hover:bg-[#c77888]"
            >
              <PlusCircle size={18} />
              Novo vale / desconto
            </button>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Comissao a receber" value={resumoGeral.totalPendente} tone="rose" icon={<DollarSign size={18} />} />
        <SummaryCard label="Vales em aberto" value={resumoGeral.totalVales} tone="amber" icon={<Wallet size={18} />} />
        <SummaryCard label="Descontos em aberto" value={resumoGeral.totalDescontos} tone="amber" icon={<MinusCircle size={18} />} />
        <SummaryCard label="Saldo liquido" value={resumoGeral.totalSaldo} tone={resumoGeral.totalSaldo >= 0 ? 'default' : 'rose'} icon={<CreditCard size={18} />} />
        <SummaryCard label="Volume bruto" value={resumoGeral.totalBruto} tone="ink" icon={<Users size={18} />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-lg dark:border-white/5 dark:bg-gray-900/40">
          <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Inicio</label>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d48997]" size={16} />
            <input
              type="date"
              value={dataInicio}
              onChange={(event) => setDataInicio(event.target.value)}
              className="h-14 w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-lg dark:border-white/5 dark:bg-gray-900/40">
          <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Fim</label>
          <div className="relative">
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d48997]" size={16} />
            <input
              type="date"
              value={dataFim}
              onChange={(event) => setDataFim(event.target.value)}
              className="h-14 w-full rounded-[1.25rem] border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-lg dark:border-white/5 dark:bg-gray-900/40">
          <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Profissional</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d48997]" size={16} />
            <select
              disabled={isScopedProfessional}
              value={profissionalId}
              onChange={(event) => setProfissionalId(event.target.value)}
              className="h-14 w-full appearance-none rounded-[1.25rem] border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm font-bold text-gray-900 outline-none focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="">Todos os profissionais</option>
              {profissionais.map((profissional) => (
                <option key={profissional.id} value={profissional.id}>
                  {profissional.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[3rem] border border-gray-100 bg-white px-6 py-24 shadow-xl dark:border-white/5 dark:bg-white/[0.03]">
            <div className="relative">
              <div className="h-20 w-20 animate-spin rounded-full border-4 border-[#d48997]/15 border-t-[#d48997]" />
              <DollarSign className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#d48997]" size={26} />
            </div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-400">Sincronizando remuneracao...</p>
          </div>
        ) : profissionaisAgrupados.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-gray-100 bg-white px-6 py-24 text-center shadow-xl dark:border-white/5 dark:bg-white/[0.03]">
            <p className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">Sem dados no periodo</p>
            <p className="mt-3 text-sm text-gray-500 dark:text-white/58">
              Nenhum atendimento concluido nem lancamento financeiro encontrado para os filtros atuais.
            </p>
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
                className="overflow-hidden rounded-[3rem] border border-gray-100 bg-white shadow-2xl dark:border-white/5 dark:bg-gray-900/40"
              >
                <div
                  onClick={() => setExpandedProfs((prev) => ({ ...prev, [prof.id]: !prev[prof.id] }))}
                  className="flex cursor-pointer flex-col gap-6 p-6 transition hover:bg-gray-50/70 dark:hover:bg-white/[0.02] lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.4rem] border-2 border-[#d48997]/20 bg-gray-100 text-xl font-black uppercase text-gray-400 dark:bg-white/5">
                        {prof.fotoUrl ? <img src={prof.fotoUrl} alt={prof.nome} className="h-full w-full object-cover" /> : prof.nome.slice(0, 2)}
                      </div>
                      <div
                        className={cn(
                          'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white dark:border-gray-900',
                          prof.totalSaldo < 0 ? 'bg-amber-500' : 'bg-[#d48997]'
                        )}
                      >
                        {prof.totalSaldo < 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">{prof.nome}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#d48997]/20 bg-[#d48997]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#d48997]">
                          {prof.atendimentos} atendimentos
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/58">
                          {Object.keys(prof.dias).length} dias
                        </span>
                        {prof.totalVales > 0 && (
                          <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                            vale em aberto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Saldo</p>
                      <p className={cn('mt-2 text-3xl font-black tracking-tighter', prof.totalSaldo >= 0 ? 'text-[#d48997]' : 'text-amber-300')}>
                        {formatMoney(prof.totalSaldo)}
                      </p>
                    </div>
                    <ChevronDown
                      size={24}
                      className={cn('text-gray-300 transition-transform duration-300', expandedProfs[prof.id] && 'rotate-180')}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {expandedProfs[prof.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-100 dark:border-white/5"
                    >
                      <div className="space-y-8 p-6 md:p-8">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <SummaryCard label="Comissao a receber" value={prof.totalPendente} tone="rose" icon={<DollarSign size={16} />} />
                          <SummaryCard label="Vales" value={prof.totalVales} tone="amber" icon={<Wallet size={16} />} />
                          <SummaryCard label="Descontos" value={prof.totalDescontos} tone="amber" icon={<MinusCircle size={16} />} />
                          <SummaryCard label="Saldo liquido" value={prof.totalSaldo} tone={prof.totalSaldo >= 0 ? 'default' : 'rose'} icon={<CreditCard size={16} />} />
                        </div>

                        <div className="rounded-[2rem] border border-gray-100 bg-gray-50/80 p-5 dark:border-white/5 dark:bg-white/[0.03]">
                          <div className="grid gap-4 md:grid-cols-3">
                            <InfoLine label="Pix do profissional" value={prof.pix || 'Nao configurado'} />
                            <InfoLine label="Meta do periodo" value={prof.metaMensal > 0 ? formatMoney(prof.metaMensal) : 'Nao configurada'} />
                            <InfoLine label="Bonus estimado" value={formatMoney(prof.bonusEstimado)} />
                          </div>
                        </div>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-[0.24em] text-gray-500 dark:text-white/58">Historico de faturamento</h4>
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d48997]">
                              {prof.atendimentos} itens
                            </span>
                          </div>

                          {Object.keys(prof.dias).length === 0 ? (
                            <div className="rounded-[2rem] border border-dashed border-gray-100 bg-white px-5 py-10 text-center text-sm text-gray-400 dark:border-white/5 dark:bg-white/[0.03] dark:text-white/50">
                              Nenhum atendimento concluido neste periodo.
                            </div>
                          ) : (
                            Object.values(prof.dias)
                              .sort((a, b) => b.data.localeCompare(a.data))
                              .map((dia) => (
                                <div key={dia.data} className="space-y-4 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-lg dark:border-white/5 dark:bg-white/[0.03]">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3">
                                      <CalendarDays className="text-[#d48997]" size={16} />
                                      <span className="text-sm font-black uppercase tracking-[0.18em] text-gray-900 dark:text-white">
                                        {format(parseISO(dia.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">
                                        Producao {formatMoney(dia.bruto)}
                                      </span>
                                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#d48997]">
                                        Comissao {formatMoney(dia.comissao)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left">
                                      <thead>
                                        <tr className="border-b border-gray-100 dark:border-white/5">
                                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Horario</th>
                                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Cliente</th>
                                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Servico</th>
                                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 text-right">Valor</th>
                                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 text-right">Comissao</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dia.agendamentos.map((agendamento) => (
                                          <tr key={agendamento.id} className="border-b border-gray-50 dark:border-white/[0.04]">
                                            <td className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-white/60">
                                              {agendamento.inicioHora}
                                            </td>
                                            <td className="px-4 py-4">
                                              <p className="text-sm font-black text-gray-900 dark:text-white">{agendamento.clienteNome}</p>
                                              <p className="mt-1 text-[11px] text-gray-400">{agendamento.clienteTelefone}</p>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-white/68">
                                              {agendamento.servico?.nome || agendamento.pacote?.nome || 'Sem servico principal'}
                                            </td>
                                            <td className="px-4 py-4 text-right text-sm font-black text-gray-900 dark:text-white">
                                              {formatMoney(buildAgendamentoTotal(agendamento))}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                              <div className="inline-flex items-center gap-2">
                                                <span className="text-sm font-black text-[#d48997]">
                                                  {formatMoney(agendamento.comissaoValor)}
                                                </span>
                                                <CheckCircle2
                                                  size={14}
                                                  className={cn(agendamento.comissaoPaga ? 'text-[#d48997]' : 'text-gray-200 dark:text-white/12')}
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
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black uppercase tracking-[0.24em] text-gray-500 dark:text-white/58">Historico financeiro</h4>
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d48997]">
                              {prof.lancamentos.length} lancamentos
                            </span>
                          </div>

                          {prof.lancamentos.length === 0 ? (
                            <div className="rounded-[2rem] border border-dashed border-gray-100 bg-white px-5 py-10 text-center text-sm text-gray-400 dark:border-white/5 dark:bg-white/[0.03] dark:text-white/50">
                              Nenhum vale ou desconto registrado para este profissional.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-[2rem] border border-gray-100 bg-white shadow-lg dark:border-white/5 dark:bg-white/[0.03]">
                              <table className="w-full min-w-[820px] text-left">
                                <thead>
                                  <tr className="border-b border-gray-100 dark:border-white/5">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Data</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Tipo</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Origem</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 text-right">Valor</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 text-right">Compensado</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 text-right">Saldo</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Observacao</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prof.lancamentos.map((lancamento) => (
                                    <tr key={lancamento.id} className="border-b border-gray-50 dark:border-white/[0.04]">
                                      <td className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-white/60">
                                        {format(new Date(lancamento.data), 'dd/MM/yyyy')}
                                      </td>
                                      <td className="px-4 py-4">
                                        <span
                                          className={cn(
                                            'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                                            lancamento.tipo === 'adiantamento'
                                              ? 'bg-amber-400/12 text-amber-200'
                                              : 'bg-rose-400/12 text-rose-300'
                                          )}
                                        >
                                          {lancamento.tipo === 'adiantamento' ? 'Vale' : 'Desconto'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-white/68">
                                        {lancamento.origem === 'caixa' ? 'Caixa' : lancamento.origem === 'conta' ? 'Conta' : '-'}
                                      </td>
                                      <td className="px-4 py-4 text-right text-sm font-black text-gray-900 dark:text-white">
                                        {formatMoney(lancamento.valor)}
                                      </td>
                                      <td className="px-4 py-4 text-right text-sm font-black text-gray-500 dark:text-white/60">
                                        {formatMoney(lancamento.valorCompensado)}
                                      </td>
                                      <td className="px-4 py-4 text-right">
                                        <span className={cn('text-sm font-black', lancamento.saldoAberto > 0 ? 'text-amber-200' : 'text-[#d48997]')}>
                                          {formatMoney(lancamento.saldoAberto)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-white/58">
                                        {lancamento.descricao || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        <div className="flex flex-col gap-4 rounded-[2rem] border border-gray-100 bg-gray-50/80 p-5 dark:border-white/5 dark:bg-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Fechamento do repasse</p>
                            <p className="mt-2 text-sm text-gray-600 dark:text-white/60">
                              Ao confirmar, o sistema marca as comissoes selecionadas como pagas e abate automaticamente vales e descontos em aberto.
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
                              'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-sm font-black uppercase tracking-[0.2em] transition',
                              prof.totalPendente === 0
                                ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/25'
                                : 'bg-bellapro-ink text-white hover:bg-[#d48997]'
                            )}
                          >
                            {processingId === prof.id ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                            {prof.totalPendente === 0 ? 'Sem comissao pendente' : 'Confirmar fechamento'}
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
    <div className="rounded-[1.4rem] border border-gray-100 bg-white px-4 py-4 dark:border-white/5 dark:bg-white/[0.03]">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
