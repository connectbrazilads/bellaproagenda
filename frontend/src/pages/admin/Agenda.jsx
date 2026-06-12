import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  RefreshCw, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  X, 
  Search, 
  User, 
  Phone,
  Filter,
  Users,
  Maximize2,
  Minimize2,
  Clock3,
  CalendarDays,
  Trash2,
  CreditCard,
  ShoppingBag,
  DollarSign,
  Smartphone,
  Banknote,
  Coins,
  Check,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Zap,
  Target,
  Layers,
  MessageSquare,
  Share2,
  Bell,
  MoreVertical
} from 'lucide-react';
import { 
  getProfissionais, getAgendamentos, getServicos, getPacotes, getProdutos,
  criarAgendamentoAdmin, criarAgendamentoAdminMultiplo, updateAgendamentoAdmin, updateStatusAgendamento, deleteAgendamento, 
  buscarClientes, addItemAgendamento, addItemComandaAgendamento, removeItemAgendamento, addProdutoAgendamento, removeProdutoAgendamento, updatePagamentoAgendamento, updateObservacaoAgendamento,
  createBloqueio, deleteBloqueio, getListaEspera, createListaEspera, deleteListaEspera, getCaixaStatusPagamento, reorderProfissionais,
  reabrirComandaAgendamento, getClientePacotes
} from '../../services/api';
import {
  addDays,
  calculateAgendamentoDuration,
  calculateGroupedAgendamentosTotal,
  calculateAgendamentoTotal,
  cn,
  formatDateBR,
  formatDateInput,
  formatDurationLabel,
  getAgendamentosMesmoClienteNoDia,
  getAgendamentoBasePrice,
  getAgendamentoItensExtras,
  getAgendamentoOriginalBasePrice,
  hasAgendamentoAdjustedBasePrice,
} from '../../lib/utils';

const START_HOUR = 7;
const END_HOUR = 22;

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    bg: 'bg-white/85 dark:bg-[#1a191f]/65 backdrop-blur-md',
    border: 'border-black/[0.04] dark:border-white/[0.04] hover:border-amber-500/30 dark:hover:border-amber-400/40',
    text: 'text-amber-700 dark:text-[#f3c16e]',
    accent: 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    dot: 'bg-amber-500',
    icon: Clock3
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-white/85 dark:bg-[#1a191f]/65 backdrop-blur-md',
    border: 'border-black/[0.04] dark:border-white/[0.04] hover:border-[#d48997]/30 dark:hover:border-[#d48997]/40',
    text: 'text-[#9c515f] dark:text-[#f4d1d6]',
    accent: 'bg-[#d48997] dark:bg-[#e29ba8] shadow-[0_0_12px_rgba(212,137,151,0.3)]',
    dot: 'bg-[#d48997]',
    icon: CalendarDays
  },
  em_atendimento: {
    label: 'Em Agenda',
    bg: 'bg-white/85 dark:bg-[#1a191f]/65 backdrop-blur-md',
    border: 'border-black/[0.04] dark:border-white/[0.04] hover:border-blue-500/30 dark:hover:border-blue-400/40',
    text: 'text-blue-700 dark:text-[#7bb0ff]',
    accent: 'bg-blue-500 dark:bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    dot: 'bg-blue-500',
    icon: Zap
  },
  concluido: {
    label: 'Concluido',
    bg: 'bg-white/85 dark:bg-[#1a191f]/65 backdrop-blur-md',
    border: 'border-black/[0.04] dark:border-white/[0.04] hover:border-emerald-500/30 dark:hover:border-emerald-400/40',
    text: 'text-emerald-700 dark:text-[#72f1c5]',
    accent: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    dot: 'bg-emerald-500',
    icon: CheckCircle2
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-white/85 dark:bg-[#1a191f]/65 backdrop-blur-md',
    border: 'border-black/[0.04] dark:border-white/[0.04] hover:border-red-500/30 dark:hover:border-red-400/40',
    text: 'text-red-600 dark:text-[#f87171]',
    accent: 'bg-red-500 dark:bg-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
    dot: 'bg-red-500',
    icon: AlertCircle
  },
};

function normalizePhone(value = '') {
  return value.replace(/\D/g, '');
}

function addMinutesToTime(horaStr, minutes = 60) {
  const [hours, mins] = (horaStr || '00:00').split(':').map(Number);
  const totalMinutes = ((Number.isNaN(hours) ? 0 : hours) * 60) + (Number.isNaN(mins) ? 0 : mins) + minutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nextHours = Math.floor(normalizedMinutes / 60);
  const nextMinutes = normalizedMinutes % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

function getApiErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

function reorderProfessionalsList(list, draggedId, targetId) {
  const fromIndex = list.findIndex((item) => item.id === draggedId);
  const toIndex = list.findIndex((item) => item.id === targetId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function getMobileAppointmentLayout(inicioHora, duracaoMin, mobileHourHeight) {
  const [hour, minute] = String(inicioHora || '00:00').split(':').map(Number);
  const safeHour = Number.isNaN(hour) ? START_HOUR : hour;
  const safeMinute = Number.isNaN(minute) ? 0 : minute;
  const top = ((safeHour - START_HOUR) * mobileHourHeight) + ((safeMinute / 60) * mobileHourHeight) + 54;
  const naturalHeight = Math.max((duracaoMin / 60) * mobileHourHeight - 4, 44);
  const remainingMinutesInHour = Math.max(15, 60 - safeMinute);
  const maxHeightInsideHour = Math.max((remainingMinutesInHour / 60) * mobileHourHeight - 8, 24);
  const height = Math.min(naturalHeight, maxHeightInsideHour);

  return {
    top,
    height,
    compact: height < 62,
  };
}

function getAgendamentoTitulo(agendamento) {
  return agendamento?.servico?.nome
    || agendamento?.pacote?.nome
    || getAgendamentoItensExtras(agendamento).map((item) => item.nome || item.servico?.nome).filter(Boolean).join(' + ')
    || 'Servico';
}

function isAgendamentoOnline(agendamento) {
  return String(agendamento?.origem || '').toLowerCase() === 'online';
}

// Se??o visual BellaPro

function ModalNovoAgendamento({ onClose, onSave, preData, preHora, preProf, prefillData }) {
  const [modoReserva, setModoReserva] = useState('simples');
  const [form, setForm] = useState({
    clienteNome: '',
    clienteTelefone: '',
    profissionalId: preProf || '',
    servicoIds: [],
    pacoteId: '',
    data: preData || formatDateInput(),
    hora: preHora || '',
    recorrente: false,
    semanas: 4,
    encaixe: false,
  });
  const [multiItemForm, setMultiItemForm] = useState({
    servicoId: '',
    profissionalId: preProf || '',
    hora: preHora || '',
  });
  const [multiItens, setMultiItens] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [isPacote, setIsPacote] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [agendamentosCliente, setAgendamentosCliente] = useState([]);
  const [loadingDuplicidade, setLoadingDuplicidade] = useState(false);
  const [abaResumo, setAbaResumo] = useState('dados');
  const [buscaServico, setBuscaServico] = useState('');
  const [buscaPacote, setBuscaPacote] = useState('');
  const [buscaProfissional, setBuscaProfissional] = useState('');

  useEffect(() => {
    if (!prefillData) return;
    setForm((prev) => ({
      ...prev,
      ...prefillData,
      profissionalId: prefillData.profissionalId || prev.profissionalId,
      servicoIds: prefillData.servicoIds || prev.servicoIds,
      clienteNome: prefillData.clienteNome || prev.clienteNome,
      clienteTelefone: prefillData.clienteTelefone || prev.clienteTelefone,
    }));
  }, [prefillData]);

  useEffect(() => {
    setMultiItemForm((prev) => ({
      ...prev,
      profissionalId: prev.profissionalId || preProf || '',
      hora: prev.hora || preHora || '',
    }));
  }, [preProf, preHora]);

  useEffect(() => {
    getServicos().then((r) => setServicos(r?.data || []));
    getPacotes().then((r) => setPacotes(r?.data || []));
    getProfissionais().then((r) => setProfissionais((r?.data || []).filter((p) => p.ativo)));
  }, []);

  const hourOptions = useMemo(
    () => Array.from({ length: (END_HOUR - START_HOUR) * 4 + 1 }, (_, i) => {
      const totalMin = START_HOUR * 60 + i * 15;
      const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
      const m = String(totalMin % 60).padStart(2, '0');
      return `${h}:${m}`;
    }),
    []
  );

  const servicoMap = useMemo(
    () => new Map((servicos || []).map((servico) => [servico.id, servico])),
    [servicos]
  );

  const getServicoIdsProfissional = (profissional) =>
    new Set((profissional?.servicosEfetivos || profissional?.servicos || []).map((item) => item.servicoId));

  const servicoIdsDoProfissionalSelecionado = useMemo(() => {
    const profissional = profissionais.find((p) => p.id === form.profissionalId);
    return getServicoIdsProfissional(profissional);
  }, [profissionais, form.profissionalId]);

  const servicoIdsDoPacoteSelecionado = useMemo(() => {
    const pacote = pacotes.find((item) => item.id === form.pacoteId);
    return (pacote?.servicos || []).map((item) => item.servicoId);
  }, [pacotes, form.pacoteId]);

  const profissionaisCompativeis = useMemo(() => {
    const servicosNecessarios = form.pacoteId ? servicoIdsDoPacoteSelecionado : form.servicoIds;
    if (servicosNecessarios.length === 0) return profissionais;

    return profissionais.filter((profissional) => {
      const servicosDoProfissional = getServicoIdsProfissional(profissional);
      return servicosNecessarios.every((servicoId) => servicosDoProfissional.has(servicoId));
    });
  }, [profissionais, form.servicoIds, form.pacoteId, servicoIdsDoPacoteSelecionado]);

  const servicosDisponiveis = useMemo(() => {
    if (!form.profissionalId) return servicos;
    return servicos.filter((servico) => servicoIdsDoProfissionalSelecionado.has(servico.id));
  }, [servicos, form.profissionalId, servicoIdsDoProfissionalSelecionado]);

  const pacotesDisponiveis = useMemo(() => {
    if (!form.profissionalId) return pacotes;
    return pacotes.filter((pacote) =>
      (pacote.servicos || []).every((item) => servicoIdsDoProfissionalSelecionado.has(item.servicoId))
    );
  }, [pacotes, form.profissionalId, servicoIdsDoProfissionalSelecionado]);

  const servicosDisponiveisFiltrados = useMemo(() => {
    const termo = buscaServico.trim().toLowerCase();
    const origem = modoReserva === 'multi' ? servicos : servicosDisponiveis;
    if (!termo) return origem;
    return origem.filter((servico) => String(servico.nome || '').toLowerCase().includes(termo));
  }, [buscaServico, modoReserva, servicos, servicosDisponiveis]);

  const pacotesDisponiveisFiltrados = useMemo(() => {
    const termo = buscaPacote.trim().toLowerCase();
    if (!termo) return pacotesDisponiveis;
    return pacotesDisponiveis.filter((pacote) => String(pacote.nome || '').toLowerCase().includes(termo));
  }, [pacotesDisponiveis, buscaPacote]);

  const profissionaisCompativeisFiltrados = useMemo(() => {
    const termo = buscaProfissional.trim().toLowerCase();
    if (!termo) return profissionaisCompativeis;
    return profissionaisCompativeis.filter((profissional) => String(profissional.nome || '').toLowerCase().includes(termo));
  }, [profissionaisCompativeis, buscaProfissional]);

  const profissionaisMultiCompativeis = useMemo(() => {
    if (!multiItemForm.servicoId) return profissionais;
    return profissionais.filter((profissional) => getServicoIdsProfissional(profissional).has(multiItemForm.servicoId));
  }, [profissionais, multiItemForm.servicoId]);

  const profissionaisMultiCompativeisFiltrados = useMemo(() => {
    const termo = buscaProfissional.trim().toLowerCase();
    if (!termo) return profissionaisMultiCompativeis;
    return profissionaisMultiCompativeis.filter((profissional) => String(profissional.nome || '').toLowerCase().includes(termo));
  }, [buscaProfissional, profissionaisMultiCompativeis]);

  const totalMulti = useMemo(
    () => multiItens.reduce((sum, item) => sum + Number(servicoMap.get(item.servicoId)?.preco || 0), 0),
    [multiItens, servicoMap]
  );

  useEffect(() => {
    if (!form.profissionalId) return;
    const profissionalAindaCompativel = profissionaisCompativeis.some((profissional) => profissional.id === form.profissionalId);
    if (!profissionalAindaCompativel) {
      setForm((prev) => ({ ...prev, profissionalId: '' }));
    }
  }, [form.profissionalId, profissionaisCompativeis]);

  useEffect(() => {
    if (!multiItemForm.profissionalId) return;
    const profissionalAindaCompativel = profissionaisMultiCompativeis.some((profissional) => profissional.id === multiItemForm.profissionalId);
    if (!profissionalAindaCompativel) {
      setMultiItemForm((prev) => ({ ...prev, profissionalId: '' }));
    }
  }, [multiItemForm.profissionalId, profissionaisMultiCompativeis]);

  useEffect(() => {
    if (!form.profissionalId) return;

    const servicosInvalidos = form.servicoIds.filter((servicoId) => !servicoIdsDoProfissionalSelecionado.has(servicoId));
    const pacoteInvalido = form.pacoteId && !servicoIdsDoPacoteSelecionado.every((servicoId) => servicoIdsDoProfissionalSelecionado.has(servicoId));

    if (servicosInvalidos.length === 0 && !pacoteInvalido) return;

    setForm((prev) => ({
      ...prev,
      servicoIds: prev.servicoIds.filter((servicoId) => servicoIdsDoProfissionalSelecionado.has(servicoId)),
      pacoteId: pacoteInvalido ? '' : prev.pacoteId,
    }));
  }, [form.profissionalId, form.servicoIds, form.pacoteId, servicoIdsDoProfissionalSelecionado, servicoIdsDoPacoteSelecionado]);

  async function buscar(val) {
    if (val.length < 2) {
      setSugestoes([]);
      return;
    }
    try {
      const res = await buscarClientes(val);
      setSugestoes(res?.data || []);
      setShowSug(true);
    } catch (e) {
      console.error(e);
    }
  }

  function selecionar(cliente) {
    setForm((prev) => ({
      ...prev,
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone,
    }));
    setSugestoes([]);
    setShowSug(false);
  }

  useEffect(() => {
    const telefone = normalizePhone(form.clienteTelefone);
    const nome = form.clienteNome.trim().toLowerCase();

    async function carregarDuplicidade() {
      if (!form.data || (!telefone && nome.length < 2)) {
        setAgendamentosCliente([]);
        setAbaResumo('dados');
        return;
      }

      setLoadingDuplicidade(true);
      try {
        const res = await getAgendamentos({ data: form.data });
        const doMesmoCliente = (res?.data?.agendamentos || []).filter((ag) => {
          const mesmoGrupo = ag.grupoAtendimentoId && multiItens.some((item) => item.grupoAtendimentoId && item.grupoAtendimentoId === ag.grupoAtendimentoId);
          const mesmoTelefone = telefone && normalizePhone(ag.clienteTelefone) === telefone;
          const mesmoNome = !telefone && nome && ag.clienteNome?.trim().toLowerCase() === nome;
          return ag.status !== 'cancelado' && (mesmoGrupo || mesmoTelefone || mesmoNome);
        });

        setAgendamentosCliente(doMesmoCliente);
        setAbaResumo(doMesmoCliente.length > 0 ? 'conflitos' : 'dados');
      } catch (e) {
        console.error(e);
        setAgendamentosCliente([]);
      } finally {
        setLoadingDuplicidade(false);
      }
    }

    carregarDuplicidade();
  }, [form.clienteNome, form.clienteTelefone, form.data, multiItens]);

  function toggleServico(id) {
    if (form.profissionalId && !servicoIdsDoProfissionalSelecionado.has(id)) return;

    setForm((prev) => ({
      ...prev,
      servicoIds: prev.servicoIds.includes(id)
        ? prev.servicoIds.filter((servicoId) => servicoId !== id)
        : [...prev.servicoIds, id],
      pacoteId: '',
    }));
  }

  function addMultiItem() {
    if (!multiItemForm.servicoId || !multiItemForm.profissionalId || !multiItemForm.hora) {
      window.alert('Selecione servico, profissional e horario para adicionar o item.');
      return;
    }

    const servico = servicoMap.get(multiItemForm.servicoId);
    if (!servico) {
      window.alert('Servico invalido para este item.');
      return;
    }

    const duplicado = multiItens.some((item) =>
      item.servicoId === multiItemForm.servicoId
      && item.profissionalId === multiItemForm.profissionalId
      && item.hora === multiItemForm.hora
    );

    if (duplicado) {
      window.alert('Este item ja foi adicionado na comanda.');
      return;
    }

    setMultiItens((prev) => [
      ...prev,
      {
        id: `${multiItemForm.servicoId}-${multiItemForm.profissionalId}-${multiItemForm.hora}-${prev.length}`,
        servicoId: multiItemForm.servicoId,
        profissionalId: multiItemForm.profissionalId,
        hora: multiItemForm.hora,
      },
    ]);

    setMultiItemForm((prev) => ({
      ...prev,
      servicoId: '',
      hora: '',
    }));
    setBuscaServico('');
  }

  function removeMultiItem(id) {
    setMultiItens((prev) => prev.filter((item) => item.id !== id));
  }

  async function salvar() {
    if (!form.clienteNome || !form.clienteTelefone) {
      window.alert('Preencha nome e telefone do cliente.');
      return;
    }

    try {
      if (modoReserva === 'multi') {
        if (!form.data || multiItens.length === 0) {
          window.alert('Escolha a data e adicione ao menos um item ao atendimento.');
          return;
        }

        await criarAgendamentoAdminMultiplo({
          clienteNome: form.clienteNome,
          clienteTelefone: form.clienteTelefone,
          data: form.data,
          itens: multiItens.map((item) => ({
            servicoId: item.servicoId,
            profissionalId: item.profissionalId,
            hora: item.hora,
          })),
        });
      } else {
        if (!form.profissionalId || (form.servicoIds.length === 0 && !form.pacoteId) || !form.hora) {
          window.alert('Preencha todos os campos obrigatorios.');
          return;
        }

        await criarAgendamentoAdmin(form);
      }

      onSave();
    } catch (e) {
      window.alert(e.response?.data?.error || 'Erro ao criar agendamento.');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-2xl sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 40, opacity: 0 }}
        className="relative h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-gray-200 bg-white p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] dark:border-white/5 dark:bg-[#0c0c0e] md:h-auto md:max-h-[92dvh] md:rounded-[3rem] md:p-10 md:pr-6 xl:p-14 xl:pr-8"
      >
        <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-[#d48997] via-fuchsia-500 to-indigo-600" />

        <button
          onClick={onClose}
          className="absolute right-6 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-[#3b2a35] shadow-sm transition-all hover:scale-105 hover:text-red-500 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white md:right-10 md:top-5"
        >
          <X size={24} />
        </button>

        <div className="mb-8 pr-14 md:mb-12 md:pr-16">
          <div className="mb-3 flex items-center gap-4">
            <div className="rounded-2xl bg-[#d48997] p-3 shadow-xl shadow-[#E29BA8]/20">
              <CalendarIcon size={24} className="text-gray-900 dark:text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white md:text-3xl xl:text-4xl">
                Nova Reserva
              </h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#E29BA8]">BellaPro Agenda</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[2rem] border border-gray-200 bg-gray-50 p-2 dark:border-white/5 dark:bg-white/5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAbaResumo('dados')}
                className={cn(
                  'flex-1 rounded-[2rem] px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                  abaResumo === 'dados' ? 'bg-white text-[#d48997] shadow-xl dark:bg-[#d48997] dark:text-white' : 'text-gray-400'
                )}
              >
                Dados da Reserva
              </button>
              <button
                type="button"
                onClick={() => setAbaResumo('conflitos')}
                className={cn(
                  'flex-1 rounded-[2rem] px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                  abaResumo === 'conflitos' ? 'bg-white text-bellapro-blush shadow-xl dark:bg-bellapro-blush/90 dark:text-white' : 'text-gray-400',
                  agendamentosCliente.length > 0 && 'text-bellapro-blush dark:text-amber-300'
                )}
              >
                Outro Agendamento
              </button>
            </div>
          </div>

          {abaResumo === 'conflitos' && (
            <div className="space-y-4 rounded-[2rem] border border-amber-200 bg-amber-50/80 p-4 dark:border-bellapro-blush/20 dark:bg-bellapro-blush/10 sm:p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bellapro-blush">Cliente ja possui agenda no dia</p>
                  <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                    {loadingDuplicidade ? 'Verificando agendamentos...' : `${agendamentosCliente.length} horario(s) encontrado(s) em ${formatDateBR(form.data)}`}
                  </h3>
                </div>
                {agendamentosCliente.length > 0 && (
                  <span className="rounded-full bg-bellapro-blush px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    Agenda
                  </span>
                )}
              </div>

              {agendamentosCliente.length > 0 ? (
                <div className="space-y-3">
                  {agendamentosCliente.map((ag) => (
                    <div key={ag.id} className="flex items-center justify-between gap-4 rounded-[1.75rem] border border-amber-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-black/20">
                      <div>
                        <p className="text-sm font-black uppercase text-gray-900 dark:text-white">{ag.profissional?.nome}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-bellapro-blush">
                          {ag.inicioHora} - {getAgendamentoTitulo(ag)}
                        </p>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        {formatDurationLabel(calculateAgendamentoDuration(ag))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-gray-500 dark:text-gray-300">
                  Nenhum outro agendamento encontrado para este cliente nesta data.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:p-4">
            <div className="relative space-y-3">
              <label className="ml-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">
                <Phone size={10} className="text-[#d48997]" /> WhatsApp / Telefone
              </label>
              <input
                value={form.clienteTelefone}
                onChange={(e) => {
                  const valor = e.target.value.replace(/\D/g, '');
                  setForm((prev) => ({ ...prev, clienteTelefone: valor }));
                  buscar(valor);
                }}
                placeholder="(00) 00000-0000"
                className="w-full rounded-[2rem] border border-gray-100 bg-gray-50 px-8 py-5 text-sm font-black text-gray-900 outline-none transition-all focus:ring-4 ring-[#E29BA8]/10 dark:border-white/5 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="relative space-y-3">
              <label className="ml-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">
                <User size={10} className="text-[#d48997]" /> Nome Completo
              </label>
              <input
                value={form.clienteNome}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, clienteNome: e.target.value }));
                  buscar(e.target.value);
                }}
                placeholder="Identificacao do cliente..."
                className="w-full rounded-[2rem] border border-gray-100 bg-gray-50 px-8 py-5 text-sm font-black text-gray-900 outline-none transition-all focus:ring-4 ring-[#E29BA8]/10 dark:border-white/5 dark:bg-white/5 dark:text-white"
              />

              <AnimatePresence>
                {showSug && sugestoes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute left-0 right-0 top-full z-[210] mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#121214]"
                  >
                    {sugestoes.map((sugestao) => (
                      <button
                        key={sugestao.id}
                        onClick={() => selecionar(sugestao)}
                        className="group flex w-full items-center justify-between px-8 py-5 text-left transition-all hover:bg-[#d48997]"
                      >
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-gray-900 transition-colors group-hover:text-gray-900 dark:text-white">
                            {sugestao.nome}
                          </p>
                          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 group-hover:text-gray-600 dark:text-white/60">
                            {sugestao.telefone}
                          </p>
                        </div>
                        <Check size={16} className="text-[#E29BA8] opacity-0 transition-all group-hover:opacity-100 group-hover:text-gray-900 dark:text-white" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex rounded-[2rem] border border-gray-200 bg-gray-100 p-2 dark:border-white/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setModoReserva('simples')}
              className={cn(
                'flex-1 rounded-[2rem] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                modoReserva === 'simples' ? 'bg-white text-[#d48997] shadow-xl dark:bg-[#d48997] dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              )}
            >
              Reserva Simples
            </button>
            <button
              type="button"
              onClick={() => setModoReserva('multi')}
              className={cn(
                'flex-1 rounded-[2rem] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                modoReserva === 'multi' ? 'bg-white text-[#d48997] shadow-xl dark:bg-[#d48997] dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              )}
            >
              Multi-Profissional
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:p-4">
            <div className="space-y-3">
              <label className="ml-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Data</label>
              <div className="relative w-full rounded-[2rem] border border-gray-100 bg-gray-50 py-5 pl-16 pr-8 dark:border-white/5 dark:bg-white/5">
                <CalendarIcon size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-[#E29BA8]" />
                <span className="block text-sm font-black tracking-[0.15em] text-gray-900 dark:text-white">
                  {formatDateBR(form.data)}
                </span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((prev) => ({ ...prev, data: e.target.value }))}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Selecionar data"
                />
              </div>
            </div>

            {modoReserva === 'simples' ? (
              <div className="space-y-3">
                <label className="ml-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Horario</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-[#E29BA8]" />
                  <select
                    value={form.hora}
                    onChange={(e) => setForm((prev) => ({ ...prev, hora: e.target.value }))}
                    className="w-full cursor-pointer appearance-none rounded-[2rem] border border-gray-100 bg-gray-50 py-5 pl-16 pr-8 text-sm font-black text-gray-900 outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    {hourOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-[#E29BA8]/20 bg-[#E29BA8]/5 px-5 py-4 text-sm font-bold text-[#8a4a58] dark:text-[#f0c1ca]">
                Todos os itens criados neste modo ficam na mesma comanda e usam a data acima.
              </div>
            )}
          </div>

          {modoReserva === 'simples' ? (
            <>
              <div className="flex rounded-[2rem] border border-gray-200 bg-gray-100 p-2 dark:border-white/5 dark:bg-white/5">
                <button
                  onClick={() => setIsPacote(false)}
                  className={cn(
                    'flex-1 rounded-[2rem] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                    !isPacote ? 'bg-white text-[#d48997] shadow-xl dark:bg-[#d48997] dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  )}
                >
                  Servicos Individuais
                </button>
                <button
                  onClick={() => setIsPacote(true)}
                  className={cn(
                    'flex-1 rounded-[2rem] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
                    isPacote ? 'bg-white text-[#d48997] shadow-xl dark:bg-[#d48997] dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  )}
                >
                  Pacotes Combo
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:p-4">
                {isPacote ? (
                  <div className="space-y-3">
                    <label className="ml-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Catalogo de Pacotes</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={buscaPacote}
                        onChange={(e) => setBuscaPacote(e.target.value)}
                        placeholder="Escreva para buscar um pacote"
                        className="w-full rounded-[1.75rem] border border-gray-200 bg-white py-4 pl-12 pr-4 text-sm font-bold text-gray-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <select
                      value={form.pacoteId}
                      onChange={(e) => setForm((prev) => ({ ...prev, pacoteId: e.target.value, servicoIds: [] }))}
                      className="w-full cursor-pointer appearance-none rounded-[2rem] border border-gray-200 bg-gray-50 px-8 py-5 text-sm font-black text-gray-900 outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                    >
                      <option value="" className="dark:bg-gray-900">Escolha o combo...</option>
                      {pacotesDisponiveisFiltrados.map((pacote) => (
                        <option key={pacote.id} value={pacote.id} className="dark:bg-gray-900">
                          {pacote.nome} - R$ {pacote.preco}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="ml-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Selecao Multi-Servico</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={buscaServico}
                        onChange={(e) => setBuscaServico(e.target.value)}
                        placeholder="Escreva para buscar um servico"
                        className="w-full rounded-[1.75rem] border border-gray-200 bg-white py-4 pl-12 pr-4 text-sm font-bold text-gray-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <div className="grid max-h-56 grid-cols-1 gap-3 overflow-y-auto rounded-[2rem] border border-gray-200 bg-gray-100 p-4 shadow-inner custom-scrollbar dark:border-white/5 dark:bg-white/5 sm:grid-cols-2 xl:grid-cols-3 md:gap-4 md:p-6">
                      {servicosDisponiveisFiltrados.map((servico) => (
                        <button
                          key={servico.id}
                          type="button"
                          onClick={() => toggleServico(servico.id)}
                          className={cn(
                            'relative overflow-hidden rounded-2xl border-2 px-5 py-4 text-left text-[10px] font-black uppercase tracking-tight transition-all duration-500',
                            form.servicoIds.includes(servico.id)
                              ? 'border-[#d48997] bg-[#d48997] text-white shadow-lg shadow-[#E29BA8]/30'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-[#E29BA8]/40 dark:border-white/5 dark:bg-[#1a1a1c]'
                          )}
                        >
                          {servico.nome}
                          {form.servicoIds.includes(servico.id) && <Check size={10} className="absolute right-2 top-2" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="ml-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Artista Responsavel</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={buscaProfissional}
                      onChange={(e) => setBuscaProfissional(e.target.value)}
                      placeholder="Escreva para buscar o profissional"
                      className="w-full rounded-[1.75rem] border border-gray-200 bg-white py-4 pl-12 pr-4 text-sm font-bold text-gray-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <select
                    value={form.profissionalId}
                    onChange={(e) => setForm((prev) => ({ ...prev, profissionalId: e.target.value }))}
                    className="w-full cursor-pointer appearance-none rounded-[2rem] border border-gray-100 bg-gray-50 px-8 py-5 text-sm font-black text-gray-900 outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                  >
                    <option value="" className="dark:bg-gray-900">Selecione o profissional...</option>
                    {profissionaisCompativeisFiltrados.map((profissional) => (
                      <option key={profissional.id} value={profissional.id} className="dark:bg-gray-900">
                        {profissional.nome}
                      </option>
                    ))}
                  </select>
                  {(form.servicoIds.length > 0 || form.pacoteId) && profissionaisCompativeis.length === 0 && (
                    <p className="ml-6 text-xs font-bold text-bellapro-blush">
                      Nenhum profissional atende essa combinacao de servicos.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:p-4">
                <div className="flex items-center gap-4 rounded-[2rem] border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5 sm:p-6">
                  <input
                    type="checkbox"
                    id="recorrente"
                    checked={form.recorrente}
                    onChange={(e) => setForm((prev) => ({ ...prev, recorrente: e.target.checked }))}
                    className="h-6 w-6 cursor-pointer rounded-lg accent-[#d48997]"
                  />
                  <label htmlFor="recorrente" className="cursor-pointer text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                    Repetir Semanalmente
                  </label>
                </div>

                {form.recorrente && (
                  <div className="space-y-3">
                    <label className="ml-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Numero de Semanas</label>
                    <select
                      value={form.semanas}
                      onChange={(e) => setForm((prev) => ({ ...prev, semanas: Number(e.target.value) }))}
                      className="w-full rounded-[2rem] border border-gray-100 bg-gray-50 px-8 py-5 text-sm font-black text-gray-900 outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                    >
                      <option value={4}>4 Semanas (1 mes)</option>
                      <option value={8}>8 Semanas (2 mes)</option>
                      <option value={12}>12 Semanas (3 mes)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 rounded-[2rem] border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                <input
                  type="checkbox"
                  id="encaixe"
                  checked={form.encaixe}
                  onChange={(e) => setForm((prev) => ({ ...prev, encaixe: e.target.checked }))}
                  className="h-6 w-6 cursor-pointer rounded-lg accent-[#d48997]"
                />
                <label htmlFor="encaixe" className="cursor-pointer text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                  Forcar Encaixe (Permitir Sobreposicao)
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 rounded-[2rem] border border-gray-200 bg-gray-50 p-5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E29BA8]">Comanda do dia</p>
                    <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                      Adicione os procedimentos por profissional
                    </h3>
                  </div>
                  <Layers size={22} className="text-[#d48997]" />
                </div>

                <div className="space-y-3">
                  <label className="ml-2 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Servico do item</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={buscaServico}
                      onChange={(e) => setBuscaServico(e.target.value)}
                      placeholder="Escreva para buscar um servico"
                      className="w-full rounded-[1.75rem] border border-gray-200 bg-white py-4 pl-12 pr-4 text-sm font-bold text-gray-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <div className="grid max-h-48 grid-cols-1 gap-3 overflow-y-auto rounded-[2rem] border border-gray-200 bg-white p-4 custom-scrollbar dark:border-white/5 dark:bg-[#121214] sm:grid-cols-2">
                    {servicosDisponiveisFiltrados.map((servico) => (
                      <button
                        key={servico.id}
                        type="button"
                        onClick={() => setMultiItemForm((prev) => ({ ...prev, servicoId: servico.id }))}
                        className={cn(
                          'rounded-2xl border px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] transition-all',
                          multiItemForm.servicoId === servico.id
                            ? 'border-[#d48997] bg-[#d48997] text-white shadow-lg shadow-[#E29BA8]/30'
                            : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white'
                        )}
                      >
                        <span className="block">{servico.nome}</span>
                        <span className={cn('mt-2 block text-[10px]', multiItemForm.servicoId === servico.id ? 'text-white/80' : 'text-gray-400')}>
                          R$ {Number(servico.preco || 0).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="ml-2 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Profissional do item</label>
                    <select
                      value={multiItemForm.profissionalId}
                      onChange={(e) => setMultiItemForm((prev) => ({ ...prev, profissionalId: e.target.value }))}
                      className="w-full cursor-pointer appearance-none rounded-[2rem] border border-gray-100 bg-white px-8 py-5 text-sm font-black text-gray-900 outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">Selecione o profissional...</option>
                      {profissionaisMultiCompativeisFiltrados.map((profissional) => (
                        <option key={profissional.id} value={profissional.id} className="dark:bg-gray-900">
                          {profissional.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="ml-2 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Horario do item</label>
                    <select
                      value={multiItemForm.hora}
                      onChange={(e) => setMultiItemForm((prev) => ({ ...prev, hora: e.target.value }))}
                      className="w-full cursor-pointer appearance-none rounded-[2rem] border border-gray-100 bg-white px-8 py-5 text-sm font-black text-gray-900 outline-none dark:border-white/5 dark:bg-white/5 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {hourOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addMultiItem}
                  className="flex w-full items-center justify-center gap-3 rounded-[2rem] bg-[#d48997] px-6 py-5 text-sm font-black uppercase tracking-[0.22em] text-white shadow-xl shadow-[#E29BA8]/25 transition-all hover:bg-[#c97b8a]"
                >
                  <Plus size={18} /> Adicionar Item na Comanda
                </button>
              </div>

              <div className="space-y-4 rounded-[2rem] border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E29BA8]">Resumo da comanda</p>
                    <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                      {multiItens.length} item(ns) adicionados
                    </h3>
                  </div>
                  <p className="text-lg font-black text-[#d48997]">
                    {totalMulti.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>

                {multiItens.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-gray-300 px-5 py-8 text-center text-sm font-bold text-gray-500 dark:border-white/10 dark:text-gray-400">
                    Adicione os procedimentos e profissionais para montar a comanda do atendimento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {multiItens.map((item, index) => {
                      const servico = servicoMap.get(item.servicoId);
                      const profissional = profissionais.find((entry) => entry.id === item.profissionalId);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-gray-100 bg-gray-50 px-4 py-4 dark:border-white/5 dark:bg-black/20">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d48997]">Item {index + 1}</p>
                            <p className="mt-2 text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                              {servico?.nome || 'Servico'}
                            </p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-300">
                              {profissional?.nome || 'Profissional'} · {item.hora}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-gray-900 dark:text-white">
                              {Number(servico?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeMultiItem(item.id)}
                              className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-red-200 hover:text-red-500 dark:border-white/10 dark:text-white/70"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={salvar}
            className="group flex w-full items-center justify-center gap-4 rounded-[2rem] bg-[#0a0a0a] py-8 text-xl font-black uppercase tracking-[0.3em] text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] transition-all dark:bg-white dark:text-gray-950"
          >
            {modoReserva === 'multi' ? 'Criar Comanda' : 'Confirmar Reserva'}
            <Plus size={24} className="transition-transform group-hover:rotate-90" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalAjusteAgendamento({ agendamento, profissionais, onClose, onSave }) {
  function getAjusteRapidoDefaults(agendamentoAtual) {
    const original = getAgendamentoOriginalBasePrice(agendamentoAtual);
    const atual = getAgendamentoBasePrice(agendamentoAtual);
    const diferencaAtual = Number((atual - original).toFixed(2));

    return {
      tipo: diferencaAtual >= 0 ? 'acrescimo' : 'desconto',
      valor: Math.abs(diferencaAtual) > 0 ? String(Math.abs(diferencaAtual)) : '',
    };
  }

  const ajusteInicial = getAjusteRapidoDefaults(agendamento);
  const precoBaseOriginal = getAgendamentoOriginalBasePrice(agendamento);
  function formatIsoDateForEdit(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
  }

  function maskDateForEdit(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function parseEditDateToIso(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 8) return '';

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() !== year
      || parsed.getMonth() !== month - 1
      || parsed.getDate() !== day
    ) {
      return '';
    }

    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const initialDate = String(agendamento?.data || '').slice(0, 10);
  const [form, setForm] = useState({
    data: initialDate,
    hora: agendamento?.inicioHora || '',
    profissionalId: agendamento?.profissionalId || '',
    encaixe: false,
  });
  const [dataText, setDataText] = useState(formatIsoDateForEdit(initialDate));
  const [ajusteTipo, setAjusteTipo] = useState(ajusteInicial.tipo);
  const [ajusteValor, setAjusteValor] = useState(ajusteInicial.valor);
  const [saving, setSaving] = useState(false);
  const ajusteValorNumero = Number(ajusteValor);
  const ajusteValorInformado = ajusteValor !== '';
  const ajusteValorValido = !ajusteValorInformado
    || (Number.isFinite(ajusteValorNumero) && ajusteValorNumero >= 0);
  const ajusteAplicado = ajusteValorValido && ajusteValorInformado ? ajusteValorNumero : 0;
  const precoBaseFinal = ajusteTipo === 'desconto'
    ? Math.max(0, precoBaseOriginal - ajusteAplicado)
    : precoBaseOriginal + ajusteAplicado;
  const valorBaseAjustadoAtivo = ajusteAplicado >= 0.001;

  function blurActiveField() {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  function dismissActiveField(event) {
    event?.preventDefault?.();
    blurActiveField();
  }

  async function salvar(event) {
    event.preventDefault();
    if (!form.data || !form.hora || !form.profissionalId) {
      window.alert('Informe dia, horario e profissional para ajustar o agendamento.');
      return;
    }
    if (!ajusteValorValido) {
      window.alert('Informe um valor valido para o ajuste do servico.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        valorBaseAjustado: valorBaseAjustadoAtivo ? precoBaseFinal : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[210] flex items-start justify-center overflow-y-auto overscroll-contain p-3 sm:items-center sm:p-4"
    >
      <motion.form
        initial={{ scale: 0.96, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 24, opacity: 0 }}
        onSubmit={salvar}
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[1.6rem] border border-gray-200 bg-white p-5 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.92)] dark:border-white/5 dark:bg-[#0c0c0e] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2.4rem] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-gray-200 dark:border-white/5 p-2 text-[#8a7079] transition hover:text-[#3b2a35] dark:text-[#c7adb4] dark:hover:text-[#faf7f6]"
        >
          <X size={16} />
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E29BA8]">Alteracao de agenda</p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Alterar horario</h2>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {agendamento?.clienteNome} · {getAgendamentoTitulo(agendamento)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Dia</span>
            <input
              type="text"
              inputMode="numeric"
              value={dataText}
              onChange={(event) => {
                const nextText = maskDateForEdit(event.target.value);
                setDataText(nextText);
                setForm((prev) => ({ ...prev, data: parseEditDateToIso(nextText) }));
              }}
              placeholder="dd/mm/aaaa"
              className="h-14 w-full rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 text-sm font-black text-gray-900 dark:text-white outline-none"
            />
          </label>

          <label className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Horario</span>
            <select
              value={form.hora}
              onMouseDown={blurActiveField}
              onTouchStart={blurActiveField}
              onChange={(event) => setForm((prev) => ({ ...prev, hora: event.target.value }))}
              className="h-14 w-full rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 text-sm font-black text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selecione...</option>
              {Array.from({ length: (END_HOUR - START_HOUR) * 4 + 1 }, (_, i) => {
                const totalMin = START_HOUR * 60 + i * 15;
                const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
                const m = String(totalMin % 60).padStart(2, '0');
                const time = `${h}:${m}`;
                return <option key={time} value={time}>{time}</option>;
              })}
            </select>
          </label>
        </div>

        <label className="mt-5 block space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Profissional</span>
          <select
            value={form.profissionalId}
            onMouseDown={blurActiveField}
            onTouchStart={blurActiveField}
            onChange={(event) => setForm((prev) => ({ ...prev, profissionalId: event.target.value }))}
            className="h-14 w-full rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 text-sm font-black text-gray-900 dark:text-white outline-none"
          >
            <option value="">Selecione...</option>
            {(profissionais || []).map((profissional) => (
              <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>
            ))}
          </select>
        </label>

        <label className="mt-5 flex items-center gap-4 rounded-[1.5rem] border border-gray-200 bg-[#f8f3f5] p-4 dark:border-white/5 dark:bg-[#111113]">
          <input
            type="checkbox"
            checked={form.encaixe}
            onChange={(event) => setForm((prev) => ({ ...prev, encaixe: event.target.checked }))}
            className="h-5 w-5 cursor-pointer rounded-lg accent-[#d48997]"
          />
          <span className="cursor-pointer text-[10px] font-black uppercase tracking-[0.18em] text-gray-600 dark:text-gray-300">
            Forcar encaixe
          </span>
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Ajuste no servico</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'desconto', label: 'Desconto' },
                  { id: 'acrescimo', label: 'Acrescimo' },
                ].map((tipo) => (
                  <button
                    key={tipo.id}
                    type="button"
                    onMouseDown={dismissActiveField}
                    onClick={() => setAjusteTipo(tipo.id)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                      ajusteTipo === tipo.id
                        ? 'border-[#d48997] bg-[#d48997] text-white'
                        : 'border-gray-200 text-gray-500 hover:border-[#d48997]/30 dark:border-white/10 dark:text-white/70'
                    )}
                  >
                    {tipo.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="number"
              step="0.01"
              min="0"
              value={ajusteValor}
              onChange={(event) => setAjusteValor(event.target.value)}
              placeholder="0,00"
              className="h-14 w-full rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 text-sm font-black text-gray-900 dark:text-white outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em]">
              <span className="text-gray-400">
                Original {precoBaseOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              {valorBaseAjustadoAtivo && (
                <span className="text-[#d48997]">
                  {ajusteTipo === 'acrescimo' ? 'Acrescimo' : 'Desconto'} {ajusteAplicado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-gray-200 dark:border-white/5 bg-[#f8f3f5] px-5 py-4 dark:bg-[#111113]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Referencia</p>
            <p className="mt-2 text-lg font-black text-gray-900 dark:text-white">
              {precoBaseOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
              Final {precoBaseFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setAjusteTipo('desconto');
                  setAjusteValor('');
                }}
                className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c27a89] transition hover:text-[#a55e6e]"
              >
                Restaurar
              </button>
              {valorBaseAjustadoAtivo && (
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500 dark:text-amber-200">
                  Ajustado
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-gray-200 px-6 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a7079] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#3b2a35] dark:border-white/5 dark:text-[#c7adb4] dark:hover:text-[#faf7f6]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-[#E29BA8] px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#d48997] disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar alteracao'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function ModalDetalhesAgendamento({ agendamento: initialAgendamento, allAgendamentos = [], onClose, onUpdate, onAjustar }) {
  function getCheckoutDiscountDefaults(agendamentoAtual) {
    const original = getAgendamentoOriginalBasePrice(agendamentoAtual);
    const atual = getAgendamentoBasePrice(agendamentoAtual);
    const diferencaAtual = Number((atual - original).toFixed(2));

    return {
      tipo: diferencaAtual >= 0 ? 'acrescimo' : 'desconto',
      modo: 'valor',
      valor: Math.abs(diferencaAtual) > 0 ? String(Math.abs(diferencaAtual)) : '',
    };
  }

  const [agendamento, setAgendamento] = useState(initialAgendamento);
  const [servicos, setServicos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [concluidoSucesso, setConcluidoSucesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingObservacao, setSavingObservacao] = useState(false);
  const [tab, setTab] = useState('comanda');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [activeComandaSection, setActiveComandaSection] = useState('itens');
  const [pagamentoTaxa, setPagamentoTaxa] = useState('0');
  const [pagamentoAjusteTipo, setPagamentoAjusteTipo] = useState(() => getCheckoutDiscountDefaults(initialAgendamento).tipo);
  const [pagamentoDescontoModo, setPagamentoDescontoModo] = useState(() => getCheckoutDiscountDefaults(initialAgendamento).modo);
  const [pagamentoDesconto, setPagamentoDesconto] = useState(() => getCheckoutDiscountDefaults(initialAgendamento).valor);
  const [pagamentoAjusteObservacao, setPagamentoAjusteObservacao] = useState(initialAgendamento?.ajusteObservacao || '');
  const [caixaPagamentoStatus, setCaixaPagamentoStatus] = useState({ aberto: true, mensagem: '' });

  // Estados de Split Payment e Pacotes do Cliente
  const [clientePacotes, setClientePacotes] = useState([]);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [consumosPacote, setConsumosPacote] = useState({});
  const [metodoPrincipal, setMetodoPrincipal] = useState('PIX');
  const [pagamentoValores, setPagamentoValores] = useState({
    PIX: '',
    'Cartao de Credito': '',
    'Cartao de Debito': '',
    Dinheiro: '',
  });
  const [observacaoDraft, setObservacaoDraft] = useState(initialAgendamento?.observacao || '');
  const [servicosBusca, setServicosBusca] = useState('');
  const [produtosBusca, setProdutosBusca] = useState('');
  const [servicosExpandido, setServicosExpandido] = useState(true);
  const [produtosExpandido, setProdutosExpandido] = useState(true);
  const [profissionaisEquipe, setProfissionaisEquipe] = useState([]);
  const [novoItemComanda, setNovoItemComanda] = useState({
    servicoId: '',
    profissionalId: '',
    hora: '',
    observacao: '',
  });

  async function refreshCaixaPagamentoStatus() {
    try {
      const response = await getCaixaStatusPagamento();
      setCaixaPagamentoStatus({
        aberto: !!response.data?.aberto,
        mensagem: response.data?.mensagem || '',
      });
    } catch (error) {
      setCaixaPagamentoStatus({ aberto: true, mensagem: '' });
    }
  }

  useEffect(() => {
    getServicos().then(r => setServicos(r?.data || []));
    getProdutos().then(r => setProdutos(r?.data || []));
    getProfissionais().then(r => setProfissionaisEquipe((r?.data || []).filter((item) => item.ativo)));
    refreshCaixaPagamentoStatus();
  }, []);

  useEffect(() => {
    setAgendamento(initialAgendamento);
    setTab('comanda');
    setShowMoreActions(false);
    setActiveComandaSection('itens');
    setConcluidoSucesso(false);
    setPagamentoTaxa('0');
    setObservacaoDraft(initialAgendamento?.observacao || '');
    setServicosBusca('');
    setProdutosBusca('');
    setServicosExpandido(true);
    setProdutosExpandido(true);
    const descontoPadrao = getCheckoutDiscountDefaults(initialAgendamento);
    setPagamentoAjusteTipo(descontoPadrao.tipo);
    setPagamentoDescontoModo(descontoPadrao.modo);
    setPagamentoDesconto(descontoPadrao.valor);
    setPagamentoAjusteObservacao(initialAgendamento?.ajusteObservacao || '');
    setNovoItemComanda({
      servicoId: '',
      profissionalId: '',
      hora: '',
      observacao: '',
    });
    setConsumosPacote({});
    setMetodoPrincipal('PIX');
    setPagamentoValores({
      PIX: '',
      'Cartao de Credito': '',
      'Cartao de Debito': '',
      Dinheiro: '',
    });
  }, [initialAgendamento]);

  const loadClientePacotes = useCallback(async () => {
    if (!agendamento?.clienteId) {
      setClientePacotes([]);
      return;
    }
    setLoadingPacotes(true);
    try {
      const res = await getClientePacotes(agendamento.clienteId);
      setClientePacotes(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar pacotes do cliente:', e);
    } finally {
      setLoadingPacotes(false);
    }
  }, [agendamento?.clienteId]);

  useEffect(() => {
    if (tab === 'pagamento' && agendamento?.clienteId) {
      loadClientePacotes();
    }
  }, [tab, agendamento?.clienteId, loadClientePacotes]);

  const servicosFiltrados = useMemo(() => {
    const termo = servicosBusca.trim().toLowerCase();
    return (servicos || [])
      .filter((s) => s.id !== agendamento?.servicoId)
      .filter((s) => !termo || s.nome?.toLowerCase().includes(termo));
  }, [servicos, servicosBusca, agendamento?.servicoId]);

  const itensExtras = useMemo(() => getAgendamentoItensExtras(agendamento), [agendamento]);
  const precoBaseOriginal = useMemo(() => getAgendamentoOriginalBasePrice(agendamento), [agendamento]);
  const descontoDigitado = Number(pagamentoDesconto);
  const descontoInformado = pagamentoDesconto !== '';
  const pagamentoDescontoValido = !descontoInformado || (
    Number.isFinite(descontoDigitado) &&
    descontoDigitado >= 0 &&
    (
      pagamentoDescontoModo !== 'percentual'
      || pagamentoAjusteTipo === 'acrescimo'
      || descontoDigitado <= 100
    )
  );
  const ajusteCalculado = !pagamentoDescontoValido || !descontoInformado
    ? 0
    : pagamentoDescontoModo === 'percentual'
      ? (precoBaseOriginal * descontoDigitado) / 100
      : descontoDigitado;
  const ajusteAplicado = pagamentoAjusteTipo === 'desconto'
    ? Math.min(precoBaseOriginal, ajusteCalculado)
    : ajusteCalculado;
  const precoBaseCheckout = pagamentoAjusteTipo === 'desconto'
    ? Math.max(0, precoBaseOriginal - ajusteAplicado)
    : precoBaseOriginal + ajusteAplicado;
  const valorBaseAjustadoAtivo = ajusteAplicado >= 0.001;
  const agendamentoCheckout = useMemo(() => {
    if (!agendamento) return agendamento;
    return {
      ...agendamento,
      valorBaseAjustado: valorBaseAjustadoAtivo ? precoBaseCheckout : null,
    };
  }, [agendamento, precoBaseCheckout, valorBaseAjustadoAtivo]);

  const produtosFiltrados = useMemo(() => {
    const termo = produtosBusca.trim().toLowerCase();
    return (produtos || []).filter((p) => !termo || p.nome?.toLowerCase().includes(termo));
  }, [produtos, produtosBusca]);

  const agendamentosMesmoClienteNoDia = useMemo(
    () => getAgendamentosMesmoClienteNoDia(allAgendamentos, agendamento, { excluirCancelados: true }),
    [allAgendamentos, agendamento]
  );

  const profissionaisCompativeisNovoItem = useMemo(() => {
    if (!novoItemComanda.servicoId) return profissionaisEquipe;
    return profissionaisEquipe.filter((profissional) =>
      (profissional?.servicosEfetivos || profissional?.servicos || []).some((item) => item.servicoId === novoItemComanda.servicoId)
    );
  }, [profissionaisEquipe, novoItemComanda.servicoId]);

  const grupoComandaPendente = useMemo(
    () => agendamentosMesmoClienteNoDia.filter((item) => item.statusPagamento !== 'pago'),
    [agendamentosMesmoClienteNoDia]
  );

  const grupoComandaPago = useMemo(
    () => agendamentosMesmoClienteNoDia.filter((item) => item.statusPagamento === 'pago' || (item.pagamentos || []).length > 0 || item.status === 'concluido'),
    [agendamentosMesmoClienteNoDia]
  );

  const totalGrupoComanda = useMemo(() => {
    if (grupoComandaPendente.length === 0) return calculateAgendamentoTotal(agendamentoCheckout);
    return grupoComandaPendente.reduce((sum, item) => {
      if (item.id === agendamentoCheckout?.id) return sum + calculateAgendamentoTotal(agendamentoCheckout);
      return sum + calculateAgendamentoTotal(item);
    }, 0);
  }, [agendamentoCheckout, grupoComandaPendente]);

  // Cálculos de pacotes e split payment
  const totalPacote = useMemo(() => {
    let sum = 0;
    const items = grupoComandaPendente.length ? grupoComandaPendente : [agendamentoCheckout];
    for (const [agId, pacId] of Object.entries(consumosPacote)) {
      const agItem = items.find(a => a.id === agId);
      if (agItem) {
        sum += getAgendamentoBasePrice(agItem);
      }
    }
    return sum;
  }, [consumosPacote, grupoComandaPendente, agendamentoCheckout]);

  const totalRestante = Math.max(0, totalGrupoComanda - totalPacote);

  const totalManualPago = useMemo(() => {
    return Object.entries(pagamentoValores).reduce((sum, [forma, val]) => {
      return sum + (Number(val) || 0);
    }, 0);
  }, [pagamentoValores]);

  const diferencaPagamento = totalRestante - totalManualPago;

  const selectMetodoPrincipal = (forma) => {
    setMetodoPrincipal(forma);
    setPagamentoValores(prev => {
      const otherPaid = Object.entries(prev).reduce((sum, [f, val]) => {
        if (f === forma) return sum;
        return sum + (Number(val) || 0);
      }, 0);
      const remainder = Math.max(0, totalRestante - otherPaid);
      return {
        ...prev,
        [forma]: remainder > 0 ? String(Number(remainder.toFixed(2))) : ''
      };
    });
  };

  useEffect(() => {
    setPagamentoValores(prev => {
      const next = { PIX: '', 'Cartao de Credito': '', 'Cartao de Debito': '', Dinheiro: '' };
      next[metodoPrincipal] = totalRestante > 0 ? String(Number(totalRestante.toFixed(2))) : '';
      return next;
    });
  }, [totalRestante, metodoPrincipal]);

  const handleZerarPagamentos = () => {
    setPagamentoValores({
      PIX: '',
      'Cartao de Credito': '',
      'Cartao de Debito': '',
      Dinheiro: '',
    });
  };

  const temAlgumPacoteApt = useMemo(() => {
    const items = grupoComandaPendente.length ? grupoComandaPendente : [agendamentoCheckout];
    return items.some(item => 
      clientePacotes.some(p => 
        p.sessoesRestantes > 0 &&
        (p.pacote?.servicos || []).some(ps => ps.servicoId === item.servicoId)
      )
    );
  }, [clientePacotes, grupoComandaPendente, agendamentoCheckout]);

  async function handleSalvarObservacao() {
    if (!agendamento?.id) return;
    setSavingObservacao(true);
    try {
      const res = await updateObservacaoAgendamento(agendamento.id, observacaoDraft);
      if (res?.data) {
        setAgendamento(res.data);
        setObservacaoDraft(res.data.observacao || '');
        onUpdate?.(res.data);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao salvar observacao.');
    } finally {
      setSavingObservacao(false);
    }
  }

  async function handleAddItem(servicoId) {
    try {
      const res = await addItemAgendamento(agendamento.id, servicoId);
      if (res?.data) {
        setAgendamento(res.data);
        onUpdate(res.data);
      }
    } catch (e) { alert('Erro ao adicionar servico'); }
  }

  async function handleRemoveItem(itemId) {
    try {
      const res = await removeItemAgendamento(agendamento.id, itemId);
      if (res?.data) {
        setAgendamento(res.data);
        onUpdate(res.data);
      }
    } catch (e) { alert('Erro ao remover servico'); }
  }

  async function handleAddProduto(produtoId) {
    try {
      const res = await addProdutoAgendamento(agendamento.id, produtoId, 1);
      if (res?.data) {
        setAgendamento(res.data);
        onUpdate(res.data);
      }
    } catch (e) { alert('Erro ao adicionar produto'); }
  }

  async function handleRemoveProduto(itemId) {
    try {
      const res = await removeProdutoAgendamento(agendamento.id, itemId);
      if (res?.data) {
        setAgendamento(res.data);
        onUpdate(res.data);
      }
    } catch (e) { alert('Erro ao remover produto'); }
  }

  async function handleAddItemNaComanda() {
    if (!novoItemComanda.servicoId || !novoItemComanda.profissionalId || !novoItemComanda.hora) {
      alert('Selecione servico, profissional e horario para incluir um novo item na comanda.');
      return;
    }

    try {
      const res = await addItemComandaAgendamento(agendamento.id, novoItemComanda);
      if (res?.data) {
        setNovoItemComanda({
          servicoId: '',
          profissionalId: '',
          hora: '',
          observacao: '',
        });
        onUpdate?.();
        setAgendamento(res.data);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Nao foi possivel adicionar o item na comanda.');
    }
  }

  async function handleExcluirAgendamentoDaComanda(item) {
    if (!window.confirm(`Remover ${getAgendamentoTitulo(item)} da comanda?`)) return;

    try {
      await deleteAgendamento(item.id);
      if (item.id === agendamento.id) {
        onClose?.();
      }
      onUpdate?.();
    } catch (error) {
      alert(error.response?.data?.error || 'Nao foi possivel remover este item da comanda.');
    }
  }

  async function handleCheckout() {
    if (!pagamentoDescontoValido) {
      alert('Informe um ajuste valido antes de finalizar a cobranca.');
      return;
    }

    if (!caixaPagamentoStatus.aberto) {
      alert(caixaPagamentoStatus.mensagem || 'Abra o caixa antes de registrar pagamentos.');
      return;
    }

    if (Math.abs(diferencaPagamento) > 0.05) {
      alert('O valor total pago deve corresponder ao valor total da cobranca.');
      return;
    }

    setLoading(true);
    try {
      const pagamentos = Object.entries(pagamentoValores)
        .map(([forma, valor]) => ({ forma, valor: Number(valor) || 0 }))
        .filter(p => p.valor > 0);

      const res = await updatePagamentoAgendamento(agendamento.id, { 
        pagamentos,
        consumosPacote,
        taxaOperadora: Number(pagamentoTaxa) || 0,
        valorBaseAjustado: valorBaseAjustadoAtivo ? precoBaseCheckout : null,
        ajusteObservacao: pagamentoAjusteObservacao.trim() || null,
        agendamentoIds: (grupoComandaPendente.length ? grupoComandaPendente : [agendamento]).map((item) => item.id),
      });
      if (res?.data) {
        setAgendamento(res.data);
        const descontoPadrao = getCheckoutDiscountDefaults(res.data);
        setPagamentoAjusteTipo(descontoPadrao.tipo);
        setPagamentoDescontoModo(descontoPadrao.modo);
        setPagamentoDesconto(descontoPadrao.valor);
        setPagamentoAjusteObservacao(res.data?.ajusteObservacao || '');
        onUpdate?.();
      }
      setConcluidoSucesso(true);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao processar checkout');
    } finally {
      setLoading(false);
    }
  }

  async function handleReabrirComanda() {
    const ids = (grupoComandaPago.length ? grupoComandaPago : [agendamento]).map((item) => item.id);
    if (!window.confirm('Deseja reabrir esta comanda para ajustes?')) return;

    setLoading(true);
    try {
      const res = await reabrirComandaAgendamento(agendamento.id, { agendamentoIds: ids });
      if (res?.data) {
        setAgendamento(res.data);
        const descontoPadrao = getCheckoutDiscountDefaults(res.data);
        setPagamentoAjusteTipo(descontoPadrao.tipo);
        setPagamentoDescontoModo(descontoPadrao.modo);
        setPagamentoDesconto(descontoPadrao.valor);
        setPagamentoAjusteObservacao(res.data?.ajusteObservacao || '');
        setConcluidoSucesso(false);
        setTab('comanda');
        onUpdate?.();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Nao foi possivel reabrir a comanda.');
    } finally {
      setLoading(false);
    }
  }

  const calculateTotal = () => {
    return totalGrupoComanda;
  };

  async function handleAtualizarStatus(status) {
    if (!agendamento?.id) return;
    if (status === 'cancelado' && !window.confirm('Deseja cancelar este agendamento?')) return;

    setShowMoreActions(false);
    await updateStatusAgendamento(agendamento.id, status);
    onUpdate?.();
    onClose?.();
  }

  function handleAbrirAgendamentoGrupo(item) {
    const descontoPadrao = getCheckoutDiscountDefaults(item);
    setPagamentoAjusteTipo(descontoPadrao.tipo);
    setPagamentoDescontoModo(descontoPadrao.modo);
    setPagamentoDesconto(descontoPadrao.valor);
    setPagamentoAjusteObservacao(item?.ajusteObservacao || '');
    setObservacaoDraft(item?.observacao || '');
    setAgendamento(item);
    setTab('comanda');
    setShowMoreActions(false);
    setConcluidoSucesso(false);
  }

  function toggleComandaSection(sectionId) {
    setActiveComandaSection((current) => (current === sectionId ? '' : sectionId));
  }

  function goToPagamento() {
    refreshCaixaPagamentoStatus();
    setShowMoreActions(false);
    setTab('pagamento');
  }

  function enviarComprovanteWhatsapp({ reenvio = false } = {}) {
    const total = calculateTotal();
    const itens = [
      agendamento.servico?.nome || agendamento.pacote?.nome,
      ...itensExtras.map((item) => item.servico?.nome || item.nome),
      ...(agendamento.produtos?.map((item) => `${item.quantidade}x ${item.produto?.nome}`) || []),
    ].filter(Boolean).join(', ');

    const mensagem = encodeURIComponent(
      `${reenvio ? '*REENVIO DE COMPROVANTE*' : '*COMPROVANTE DE ATENDIMENTO*'}\n\n`
      + `Ola, *${agendamento.clienteNome}*!\n`
      + `${reenvio ? 'Segue o seu comprovante de atendimento.' : 'Seu atendimento foi finalizado com sucesso.'}\n\n`
      + `*Detalhes:*\n${itens}\n`
      + `*Valor Total:* R$ ${total.toFixed(2)}\n\n`
      + 'Agradecemos a preferencia!'
    );

    window.open(`https://wa.me/55${agendamento.clienteTelefone.replace(/\D/g, '')}?text=${mensagem}`, '_blank');
  }

  function renderSimplifiedModal() {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.98, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.98, y: 30, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white dark:bg-[#0c0c0e] rounded-t-3xl md:rounded-3xl w-full max-w-5xl h-[95dvh] md:max-h-[92dvh] flex flex-col shadow-2xl border border-black/[0.04] dark:border-white/[0.05] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 md:px-10 md:py-6 border-b border-black/[0.03] dark:border-white/[0.03] flex items-start justify-between gap-4 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md shrink-0 z-10">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#d48997]/20 to-[#e29ba8]/20 border border-[#d48997]/30 flex items-center justify-center text-[#d48997] dark:text-[#f4d1d6] shadow-sm relative shrink-0">
                <User size={20} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#d48997] border-2 border-white dark:border-[#0c0c0e] rounded-full" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight break-words">{agendamento.clienteNome}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-medium text-[#d48997] tracking-wider">Gestão de Agenda BellaPro</span>
                  {isAgendamentoOnline(agendamento) && (
                    <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[9px] font-medium tracking-wide text-[#0f9a8c] dark:text-[#72f1c5]">
                      Online
                    </span>
                  )}
                  <div className="w-1 h-1 rounded-full bg-gray-255 dark:bg-white/20" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wide">{formatDateBR(agendamento.data)} - {agendamento.inicioHora} - {agendamento.profissional?.nome}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-black/[0.04] dark:border-white/[0.04] bg-white/50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all hover:scale-105 active:scale-95 group shrink-0 shadow-sm"
            >
              <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#060608] modal-scrollbar">
            {/* Top Bar with Actions & Badges */}
            <div className="border-b border-black/[0.03] dark:border-white/[0.03] bg-gradient-to-r from-[#d48997]/[0.01] to-transparent px-6 py-4 md:px-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={cn('px-3 py-1 rounded-full text-[10px] font-medium tracking-wide border', STATUS_CONFIG[agendamento.status]?.bg, STATUS_CONFIG[agendamento.status]?.text, STATUS_CONFIG[agendamento.status]?.border)}>
                    {STATUS_CONFIG[agendamento.status]?.label || agendamento.status}
                  </div>
                  <div className={cn('px-3 py-1 rounded-full text-[10px] font-medium tracking-wide border', agendamento.statusPagamento === 'pago' ? 'bg-[#d48997]/10 text-[#d48997] border-[#d48997]/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20')}>
                    {agendamento.statusPagamento === 'pago' ? 'Pagamento OK' : 'Pagamento Pendente'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreActions(false);
                      setTab('comanda');
                    }}
                    className="rounded-xl bg-gradient-to-r from-[#d48997] to-[#e29ba8] hover:from-[#c97b8a] hover:to-[#d48997] px-4.5 py-2 text-xs font-semibold text-white shadow-sm hover:shadow transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Abrir Comanda
                  </button>
                  <button
                    type="button"
                    onClick={goToPagamento}
                    className={cn(
                      'rounded-xl px-4.5 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0',
                      agendamento.statusPagamento === 'pago'
                        ? 'border border-[#d48997]/20 bg-[#d48997]/5 text-[#d48997]'
                        : 'bg-gray-950 dark:bg-white text-white dark:text-gray-950 hover:bg-black dark:hover:bg-gray-100 shadow-sm'
                    )}
                  >
                    {agendamento.statusPagamento === 'pago' ? 'Visualizar Recibo' : 'Ir para Pagamento'}
                  </button>
                  
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMoreActions((current) => !current)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-white/5 px-4.5 py-2 text-xs font-semibold text-gray-700 dark:text-white/80 transition-all hover:bg-gray-50 dark:hover:bg-white/10"
                    >
                      <MoreVertical size={14} />
                      Ações
                    </button>

                    {showMoreActions && (
                      <div className="absolute right-0 top-full z-[100] mt-2 w-52 rounded-2xl border border-black/[0.04] bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#121214]">
                        <div className="space-y-1">
                          {agendamento.status === 'confirmado' && (
                            <button type="button" onClick={() => handleAtualizarStatus('em_atendimento')} className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-gray-700 hover:text-[#d48997] hover:bg-[#d48997]/5 transition-all dark:text-white/80 dark:hover:bg-white/10">
                              Iniciar atendimento
                            </button>
                          )}
                          {(agendamento.status === 'confirmado' || agendamento.status === 'em_atendimento') && (
                            <button type="button" onClick={() => handleAtualizarStatus('concluido')} className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-gray-700 hover:text-[#d48997] hover:bg-[#d48997]/5 transition-all dark:text-white/80 dark:hover:bg-white/10">
                              Concluir atendimento
                            </button>
                          )}
                          {agendamento.status !== 'cancelado' && (
                            <>
                              <button type="button" onClick={() => { setShowMoreActions(false); setTab('ajustes'); }} className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-gray-700 hover:text-[#d48997] hover:bg-[#d48997]/5 transition-all dark:text-white/80 dark:hover:bg-white/10">
                                Ver detalhes/ajustes
                              </button>
                              <button type="button" onClick={() => { setShowMoreActions(false); onAjustar?.(agendamento); }} className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-gray-700 hover:text-[#d48997] hover:bg-[#d48997]/5 transition-all dark:text-white/80 dark:hover:bg-white/10">
                                Alterar horario
                              </button>
                              <button type="button" onClick={() => handleAtualizarStatus('cancelado')} className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                Cancelar agendamento
                              </button>
                            </>
                          )}
                          {agendamento.statusPagamento === 'pago' && (
                            <button type="button" onClick={async () => { setShowMoreActions(false); await handleReabrirComanda(); }} className="w-full rounded-xl px-3.5 py-2.5 text-left text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10 transition-all">
                              Reabrir comanda
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Glass Info Cards */}
              <div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md px-5 py-4 hover:shadow-md transition-all duration-300">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wide">Serviço</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 normal-case leading-tight">{getAgendamentoTitulo(agendamento)}</p>
                </div>
                <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md px-5 py-4 hover:shadow-md transition-all duration-300">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wide">Profissional</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 normal-case leading-tight">{agendamento.profissional?.nome || 'Equipe'}</p>
                </div>
                <div className="rounded-2xl border border-[#d48997]/30 bg-gradient-to-br from-[#d48997]/10 to-[#e29ba8]/5 dark:from-[#d48997]/15 dark:to-transparent px-5 py-4 shadow-[0_8px_30px_rgba(212,137,151,0.08)] hover:shadow-[0_8px_30px_rgba(212,137,151,0.12)] transition-all duration-300">
                  <p className="text-[10px] font-semibold text-[#d48997] dark:text-[#efbac2] tracking-wide">Total Atual</p>
                  <p className="mt-0.5 text-xl font-serif font-semibold text-[#d48997] dark:text-white leading-tight">{Number(calculateTotal()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            </div>

            {/* Inner Content Area */}
            <div className="mx-auto w-full max-w-4xl p-6 md:p-10">
              {/* Tab Selector */}
              <div className="sticky top-0 z-10 mb-6 rounded-2xl bg-white/95 px-1 py-1 backdrop-blur dark:bg-[#060608]/95">
                <div className="grid grid-cols-3 gap-1 rounded-2xl border border-black/[0.03] dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.02] p-1">
                  {[
                    { id: 'comanda', label: 'Comanda', icon: Plus },
                    { id: 'ajustes', label: 'Detalhes', icon: Scissors },
                    { id: 'pagamento', label: 'Pagamento', icon: CreditCard },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'pagamento') {
                          goToPagamento();
                          return;
                        }
                        setShowMoreActions(false);
                        setTab(item.id);
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 sm:px-4 text-xs font-semibold transition-all duration-300',
                        tab === item.id
                          ? 'bg-white dark:bg-white/10 text-[#d48997] dark:text-white shadow-sm dark:shadow-md'
                          : 'text-gray-400 hover:text-gray-750 dark:text-gray-500 dark:hover:text-white'
                      )}
                    >
                      <item.icon size={13} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'comanda' ? (
                <div className="space-y-4">
                  {/* Itens da Comanda */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                    <button type="button" onClick={() => toggleComandaSection('itens')} className="flex w-full items-center justify-between gap-4 text-left group">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[#d48997]">Itens da Comanda</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-555 font-normal">Veja os procedimentos no atendimento e gerencie os itens extras.</p>
                      </div>
                      <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-white/5 p-2.5 transition-all hover:scale-105 active:scale-95 shadow-sm text-gray-400">
                        {activeComandaSection === 'itens' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </div>
                    </button>

                    {activeComandaSection === 'itens' && (
                      <div className="mt-5 space-y-3">
                        <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] px-5 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold text-[#d48997]">Serviço Principal</p>
                              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 normal-case leading-tight">{getAgendamentoTitulo(agendamento)}</p>
                            </div>
                            <p className="text-sm font-semibold text-[#d48997]">{precoBaseCheckout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          </div>
                        </div>

                        {itensExtras.map((item) => (
                          <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Serviço Extra</p>
                              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 normal-case leading-tight">{item.servico?.nome || item.nome}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{Number(item.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              <button type="button" onClick={() => handleRemoveItem(item.id)} className="rounded-lg border border-red-500/15 text-red-500 hover:bg-red-500/5 px-3 py-1.5 text-xs font-semibold transition-all duration-300">
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}

                        {(agendamento.produtos || []).map((item) => (
                          <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Produto</p>
                              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100 normal-case leading-tight">{item.produto?.nome || item.nome} <span className="text-gray-400 dark:text-gray-500 font-normal">x{item.quantidade}</span></p>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{Number((item.preco || 0) * (item.quantidade || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              <button type="button" onClick={() => handleRemoveProduto(item.id)} className="rounded-lg border border-red-500/15 text-red-500 hover:bg-red-500/5 px-3 py-1.5 text-xs font-semibold transition-all duration-300">
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}

                        {itensExtras.length === 0 && (agendamento.produtos || []).length === 0 && (
                          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 px-5 py-4 text-xs text-gray-400 dark:text-gray-500">
                            Esta comanda ainda possui apenas o serviço principal.
                          </div>
                        )}

                        {agendamentosMesmoClienteNoDia.length > 1 && (
                          <div className="rounded-2xl border border-black/[0.04] bg-gray-50/50 p-4 dark:border-white/[0.04] dark:bg-white/[0.02]">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-[10px] font-semibold text-[#E29BA8]">Comanda Agrupada</p>
                                <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">{agendamentosMesmoClienteNoDia.length} procedimentos no dia</p>
                              </div>
                              <p className="text-sm font-semibold text-[#d48997]">{calculateGroupedAgendamentosTotal(agendamentosMesmoClienteNoDia).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                            <div className="mt-4 space-y-2">
                              {agendamentosMesmoClienteNoDia.map((item) => (
                                <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-white border border-black/[0.03] p-4.5 dark:bg-white/[0.01] dark:border-white/[0.03] lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{item.inicioHora} · {getAgendamentoTitulo(item)}</p>
                                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">{item.profissional?.nome || 'Equipe'} · {item.statusPagamento === 'pago' ? 'Pago' : 'Pendente'}</p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => handleAbrirAgendamentoGrupo(item)} className="rounded-lg border border-black/[0.08] dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-white/70 transition hover:bg-gray-50 dark:hover:bg-white/5">
                                      Abrir
                                    </button>
                                    <button type="button" onClick={() => onAjustar?.(item)} className="rounded-lg border border-[#d48997]/25 px-3 py-1.5 text-xs font-semibold text-[#d48997] transition hover:bg-[#d48997]/5">
                                      Ajustar
                                    </button>
                                    <button type="button" onClick={() => handleExcluirAgendamentoDaComanda(item)} className="rounded-lg border border-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/5">
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Observações */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                    <button type="button" onClick={() => toggleComandaSection('observacao')} className="flex w-full items-center justify-between gap-4 text-left group">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[#d48997]">Observações</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-normal">Use este campo para registrar informações relevantes para a equipe.</p>
                      </div>
                      <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-white/5 p-2.5 transition-all hover:scale-105 active:scale-95 shadow-sm text-gray-400">
                        {activeComandaSection === 'observacao' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </div>
                    </button>

                    {activeComandaSection === 'observacao' && (
                      <div className="mt-5 space-y-4">
                        <textarea
                          value={observacaoDraft}
                          onChange={(event) => setObservacaoDraft(event.target.value)}
                          rows={3}
                          placeholder="Ex.: cliente pediu tonalidade específica, possui restrições ou preferências."
                          className="w-full rounded-2xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#111113] px-5 py-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 transition-all focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                        />
                        <div className="flex justify-end">
                          <button type="button" onClick={handleSalvarObservacao} disabled={savingObservacao} className="rounded-xl bg-[#E29BA8] hover:bg-[#d48997] px-5 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-60 shadow-sm shadow-[#E29BA8]/10 hover:-translate-y-0.5 active:translate-y-0">
                            {savingObservacao ? 'Salvando...' : 'Salvar Observação'}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Adicionar Atendimento */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                    <button type="button" onClick={() => toggleComandaSection('novo-item')} className="flex w-full items-center justify-between gap-4 text-left group">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[#d48997]">Adicionar Atendimento</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-normal">Inclua outro serviço com horário e profissional na mesma comanda.</p>
                      </div>
                      <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-white/5 p-2.5 transition-all hover:scale-105 active:scale-95 shadow-sm text-gray-400">
                        {activeComandaSection === 'novo-item' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </div>
                    </button>

                    {activeComandaSection === 'novo-item' && (
                      <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <select
                            value={novoItemComanda.servicoId}
                            onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, servicoId: event.target.value, profissionalId: '' }))}
                            className="w-full rounded-2xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#111113] px-4.5 py-3 text-sm text-gray-900 outline-none dark:text-white transition-all focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                          >
                            <option value="">Selecione o serviço</option>
                            {servicos.map((servico) => (
                              <option key={servico.id} value={servico.id}>{servico.nome}</option>
                            ))}
                          </select>

                          <select
                            value={novoItemComanda.profissionalId}
                            onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, profissionalId: event.target.value }))}
                            className="w-full rounded-2xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#111113] px-4.5 py-3 text-sm text-gray-900 outline-none dark:text-white transition-all focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                          >
                            <option value="">Selecione o profissional</option>
                            {profissionaisCompativeisNovoItem.map((profissional) => (
                              <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>
                            ))}
                          </select>

                          <input
                            type="time"
                            value={novoItemComanda.hora}
                            onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, hora: event.target.value }))}
                            className="w-full rounded-2xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#111113] px-4.5 py-3 text-sm text-gray-900 outline-none dark:text-white transition-all focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                          />

                          <input
                            value={novoItemComanda.observacao}
                            onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, observacao: event.target.value }))}
                            placeholder="Observação (opcional)"
                            className="w-full rounded-2xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#111113] px-4.5 py-3 text-sm text-gray-900 outline-none dark:text-white transition-all focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 placeholder:text-gray-400"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button type="button" onClick={handleAddItemNaComanda} disabled={!novoItemComanda.servicoId || !novoItemComanda.profissionalId || !novoItemComanda.hora} className="rounded-xl bg-[#d48997] hover:bg-[#c77787] px-5 py-2.5 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-sm shadow-[#d48997]/10 hover:-translate-y-0.5 active:translate-y-0">
                            Adicionar à Comanda
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Adicionar Serviço Rápido */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                    <button type="button" onClick={() => toggleComandaSection('servicos')} className="flex w-full items-center justify-between gap-4 text-left group">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[#d48997]">Adicionar Serviço Rápido</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-550 font-normal">Escolha um serviço da lista para incluir instantaneamente.</p>
                      </div>
                      <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-white/5 p-2.5 transition-all hover:scale-105 active:scale-95 shadow-sm text-gray-400">
                        {activeComandaSection === 'servicos' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </div>
                    </button>

                    {activeComandaSection === 'servicos' && (
                      <div className="mt-5 space-y-4">
                        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4.5 py-3 dark:border-white/10 dark:bg-[#111113]">
                          <Search size={16} className="text-gray-400" />
                          <input
                            value={servicosBusca}
                            onChange={(event) => setServicosBusca(event.target.value)}
                            placeholder="Buscar serviço por nome"
                            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                          />
                        </div>

                        {servicosFiltrados.length > 0 ? (
                          <div className="space-y-2">
                            {servicosFiltrados.map((servico) => (
                              <div key={servico.id} className="flex flex-col gap-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-white normal-case">{servico.nome}</p>
                                  <p className="mt-1 text-xs font-normal text-gray-400 dark:text-gray-500">{formatDurationLabel(servico.duracaoMin)} · {Number(servico.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <button type="button" onClick={() => handleAddItem(servico.id)} className="rounded-xl border border-[#d48997]/25 hover:border-[#d48997]/40 px-4 py-2 text-xs font-semibold text-[#d48997] hover:bg-[#d48997]/5 transition-all duration-300">
                                  Adicionar
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 px-5 py-4 text-xs text-gray-400 dark:text-gray-500">
                            Nenhum serviço encontrado com esse filtro.
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Adicionar Produto */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                    <button type="button" onClick={() => toggleComandaSection('produtos')} className="flex w-full items-center justify-between gap-4 text-left group">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[#d48997]">Adicionar Produto</p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-555 font-normal">Inclua consumo de bebidas, acessórios ou cosméticos vendidos.</p>
                      </div>
                      <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-white/5 p-2.5 transition-all hover:scale-105 active:scale-95 shadow-sm text-gray-400">
                        {activeComandaSection === 'produtos' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </div>
                    </button>

                    {activeComandaSection === 'produtos' && (
                      <div className="mt-5 space-y-4">
                        <div className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4.5 py-3 dark:border-white/10 dark:bg-[#111113]">
                          <Search size={16} className="text-gray-400" />
                          <input
                            value={produtosBusca}
                            onChange={(event) => setProdutosBusca(event.target.value)}
                            placeholder="Buscar produto por nome"
                            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                          />
                        </div>

                        {produtosFiltrados.length > 0 ? (
                          <div className="space-y-2">
                            {produtosFiltrados.map((produto) => (
                              <div key={produto.id} className="flex flex-col gap-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-white normal-case">{produto.nome}</p>
                                  <p className="mt-1 text-xs font-normal text-gray-400 dark:text-gray-500">{Number(produto.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <button type="button" onClick={() => handleAddProduto(produto.id)} className="rounded-xl border border-[#d48997]/25 hover:border-[#d48997]/40 px-4 py-2 text-xs font-semibold text-[#d48997] hover:bg-[#d48997]/5 transition-all duration-300">
                                  Adicionar
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 px-5 py-4 text-xs text-gray-400 dark:text-gray-500">
                            Nenhum produto encontrado com esse filtro.
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              ) : tab === 'ajustes' ? (
                <div className="space-y-4">
                  {/* Resumo do Atendimento */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] backdrop-blur-md p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#d48997]">Resumo do Atendimento</p>
                        <h3 className="mt-2 text-lg font-serif font-normal text-gray-900 dark:text-white normal-case leading-tight">{getAgendamentoTitulo(agendamento)}</h3>
                        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Veja os valores originais e ajustes aplicados para este serviço.</p>
                      </div>
                      <button type="button" onClick={() => onAjustar?.(agendamento)} className="rounded-xl bg-[#d48997] px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#d48997]/15 hover:bg-[#c97b8a] transition-all">
                        Alterar horario
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111113]">
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Original</p>
                        <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{precoBaseOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111113]">
                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Ajuste Aplicado</p>
                        <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                          {valorBaseAjustadoAtivo
                            ? `${pagamentoAjusteTipo === 'acrescimo' ? 'Acréscimo' : 'Desconto'} ${ajusteAplicado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                            : 'Sem ajuste'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#d48997]/20 bg-[#d48997]/5 px-4 py-4">
                        <p className="text-[10px] font-semibold text-[#d48997] dark:text-[#efbac2]">Valor Final</p>
                        <p className="mt-1 text-base font-semibold text-[#d48997] dark:text-white">{precoBaseCheckout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  </section>

                  {/* Dados Complementares */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] backdrop-blur-md p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">Dados do Atendimento</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111113]">
                        <p className="text-[10px] font-medium text-gray-400">Horário</p>
                        <p className="mt-1.5 text-xs font-semibold text-gray-900 dark:text-white">{formatDateBR(agendamento.data)} · {agendamento.inicioHora}</p>
                      </div>
                      <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111113]">
                        <p className="text-[10px] font-medium text-gray-400">Status</p>
                        <p className="mt-1.5 text-xs font-semibold text-gray-905 dark:text-white">{STATUS_CONFIG[agendamento.status]?.label || agendamento.status} · {agendamento.statusPagamento === 'pago' ? 'Pago' : 'Pendente'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Observações Registradas */}
                  <section className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] backdrop-blur-md p-6 shadow-sm">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">Observações e Histórico</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111113]">
                        <p className="text-[10px] font-medium text-[#d48997]">Do Agendamento</p>
                        <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{agendamento.observacao?.trim() || 'Nenhuma observação registrada.'}</p>
                      </div>
                      <div className="rounded-2xl border border-black/[0.04] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111113]">
                        <p className="text-[10px] font-medium text-[#d48997]">Do Ajuste de Cobrança</p>
                        <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{pagamentoAjusteObservacao.trim() || 'Nenhuma observação registrada para o ajuste.'}</p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-6 py-2">
                  {concluidoSucesso ? (
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center p-5 text-center">
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#d48997]/10 text-[#d48997] shadow-sm">
                        <CheckCircle2 size={36} />
                      </div>
                      <h2 className="text-xl md:text-2xl font-serif font-normal text-gray-900 dark:text-white tracking-wide">Pagamento Concluído</h2>
                      <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">O atendimento foi encerrado com sucesso e os registros financeiros foram consolidados.</p>
                      <div className="mt-8 w-full space-y-2">
                        <button type="button" onClick={() => enviarComprovanteWhatsapp()} className="w-full rounded-xl bg-[#25D366] py-3.5 text-xs font-semibold text-white transition hover:scale-[1.01] shadow-sm shadow-[#25D366]/10">
                          Enviar comprovante no WhatsApp
                        </button>
                        <button type="button" onClick={onClose} className="w-full rounded-xl bg-gray-50 border border-black/[0.04] py-3.5 text-xs font-semibold text-gray-500 hover:bg-[#d48997]/10 hover:text-[#d48997] transition-all dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:border-white/5">
                          Voltar para agenda
                        </button>
                      </div>
                    </div>
                  ) : agendamento.statusPagamento === 'pago' ? (
                    <div className="mx-auto max-w-xl space-y-4">
                      <div className="rounded-3xl border border-[#d48997]/25 bg-[#d48997]/5 p-6 shadow-sm">
                        <p className="text-xs font-semibold text-[#d48997] dark:text-[#efbac2]">Pagamento Confirmado</p>
                        <p className="mt-1 text-2xl font-serif font-semibold text-[#d48997] dark:text-white">{Number(calculateTotal()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        {agendamento.pagamentos && agendamento.pagamentos.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {agendamento.pagamentos.map((pag, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#d48997] dark:text-white border border-[#d48997]/20 shadow-sm">
                                {pag.forma === 'PIX' ? '⚡ PIX' 
                                 : pag.forma === 'Dinheiro' ? '💵 Dinheiro' 
                                 : pag.forma === 'Cartao de Credito' ? '💳 Crédito' 
                                 : pag.forma === 'Cartao de Debito' ? '💳 Débito' 
                                 : pag.forma === 'Cartao Parcelado' ? '💳 Parcelado' 
                                 : `💳 ${pag.forma}`}
                                {agendamento.pagamentos.length > 1 && ` (${Number(pag.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 leading-normal">Se for necessário corrigir alguma informação ou reabrir o fechamento financeiro, utilize a opção abaixo.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => enviarComprovanteWhatsapp({ reenvio: true })} className="rounded-xl bg-[#25D366] px-5 py-3.5 text-xs font-semibold text-white transition hover:scale-[1.01] shadow-sm shadow-[#25D366]/10">
                          Reenviar comprovante
                        </button>
                        <button type="button" onClick={handleReabrirComanda} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3.5 text-xs font-semibold text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 transition-all">
                          Reabrir comanda
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto max-w-xl space-y-6">
                      {!caixaPagamentoStatus.aberto && (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-xs font-semibold text-amber-600 dark:text-amber-300">
                          {caixaPagamentoStatus.mensagem || 'Atenção: Abra o caixa antes de registrar pagamentos.'}
                        </div>
                      )}

                      {/* Consumo de Pacotes */}
                      {temAlgumPacoteApt && (
                        <div className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 pb-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Consumo de Pacotes</p>
                            <button
                              type="button"
                              onClick={loadClientePacotes}
                              className="text-xs font-semibold text-[#d48997] hover:underline"
                            >
                              Atualizar pacotes
                            </button>
                          </div>
                          <div className="space-y-2.5">
                            {(grupoComandaPendente.length ? grupoComandaPendente : [agendamentoCheckout]).map((item) => {
                              const cp = clientePacotes.find(p => 
                                p.sessoesRestantes > 0 &&
                                (p.pacote?.servicos || []).some(ps => ps.servicoId === item.servicoId)
                              );

                              if (!cp) return null;

                              const isConsumido = !!consumosPacote[item.id];

                              return (
                                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-black/[0.04] bg-white p-4 dark:border-white/[0.04] dark:bg-white/[0.02]">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                      {item.inicioHora} · {getAgendamentoTitulo(item)}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                                      Pacote: {cp.pacote.nome} ({cp.sessoesRestantes} restantes)
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConsumosPacote(prev => {
                                        const next = { ...prev };
                                        if (isConsumido) {
                                          delete next[item.id];
                                        } else {
                                          next[item.id] = cp.pacote.id;
                                        }
                                        return next;
                                      });
                                    }}
                                    className={cn(
                                      'rounded-xl border px-4 py-2 text-xs font-semibold transition-all',
                                      isConsumido
                                        ? 'bg-[#E29BA8] border-[#E29BA8] text-white shadow-sm'
                                        : 'border-[#d48997]/30 text-[#d48997] hover:bg-[#d48997]/5'
                                    )}
                                  >
                                    {isConsumido ? 'Usando crédito' : 'Usar crédito'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Formas de Pagamento */}
                      <div className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5">
                        <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 pb-3 mb-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Forma de Pagamento</p>
                          <button
                            type="button"
                            onClick={handleZerarPagamentos}
                            className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-white"
                          >
                            Zerar valores
                          </button>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'PIX', forma: 'PIX', icon: Smartphone, color: 'text-[#E29BA8]' },
                            { label: 'Cartão de Crédito', forma: 'Cartao de Credito', icon: CreditCard, color: 'text-[#E29BA8]' },
                            { label: 'Cartão de Débito', forma: 'Cartao de Debito', icon: CreditCard, color: 'text-[#d48997]' },
                            { label: 'Dinheiro', forma: 'Dinheiro', icon: Banknote, color: 'text-[#d48997]' },
                          ].map((item) => {
                            const isPrincipal = metodoPrincipal === item.forma;
                            const valorAtual = pagamentoValores[item.forma] || '';

                            return (
                              <div
                                key={item.forma}
                                className={cn(
                                  'flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border p-4 transition-all bg-white dark:bg-white/[0.02]',
                                  isPrincipal ? 'border-[#d48997] bg-[#d48997]/[0.01] shadow-sm' : 'border-black/[0.04] hover:border-[#d48997]/20 dark:border-white/[0.05]'
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => selectMetodoPrincipal(item.forma)}
                                  className="flex flex-1 items-center gap-3 text-left"
                                >
                                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5', isPrincipal ? 'bg-[#d48997]/10 text-[#d48997]' : item.color)}>
                                    <item.icon size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                                      {isPrincipal ? 'Método Principal (Auto)' : 'Clique para transferir saldo restante'}
                                    </p>
                                  </div>
                                </button>
                                <div className="relative flex items-center w-full sm:w-40">
                                  <span className="absolute left-3.5 text-xs font-semibold text-gray-400">R$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={valorAtual}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPagamentoValores(prev => ({
                                        ...prev,
                                        [item.forma]: val
                                      }));
                                    }}
                                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-gray-50/50 dark:bg-[#18181b] text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ajustes no Fechamento */}
                      <div className="rounded-3xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5">
                        <p className="text-sm font-semibold text-gray-950 dark:text-white mb-4">Ajustes & Taxas</p>
                        <div className="space-y-4">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-[10px] font-medium text-gray-400">Ajuste de Valor (Serviço)</p>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { id: 'desconto', label: 'Desconto' },
                                  { id: 'acrescimo', label: 'Acréscimo' },
                                ].map((tipo) => (
                                  <button
                                    key={tipo.id}
                                    type="button"
                                    onClick={() => setPagamentoAjusteTipo(tipo.id)}
                                    className={cn(
                                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-300',
                                      pagamentoAjusteTipo === tipo.id
                                        ? 'border-[#d48997] bg-[#d48997] text-white shadow-sm'
                                        : 'border-black/[0.06] text-gray-500 hover:border-[#d48997]/30 dark:border-white/10 dark:text-white/70'
                                    )}
                                  >
                                    {tipo.label}
                                  </button>
                                ))}
                                {[
                                  { id: 'valor', label: 'R$' },
                                  { id: 'percentual', label: '%' },
                                ].map((modo) => (
                                  <button
                                    key={modo.id}
                                    type="button"
                                    onClick={() => setPagamentoDescontoModo(modo.id)}
                                    className={cn(
                                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-300',
                                      pagamentoDescontoModo === modo.id
                                        ? 'border-[#d48997] bg-[#d48997] text-white shadow-sm'
                                        : 'border-black/[0.06] text-gray-500 hover:border-[#d48997]/30 dark:border-white/10 dark:text-white/70'
                                    )}
                                  >
                                    {modo.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="number"
                              value={pagamentoDesconto}
                              onChange={(e) => setPagamentoDesconto(e.target.value)}
                              min="0"
                              max={pagamentoDescontoModo === 'percentual' ? '100' : undefined}
                              step={pagamentoDescontoModo === 'percentual' ? '1' : '0.01'}
                              placeholder={pagamentoDescontoModo === 'percentual' ? '0' : '0,00'}
                              className="w-full rounded-xl border border-black/[0.08] bg-white px-4.5 py-3 text-sm font-semibold text-gray-900 outline-none dark:border-white/10 dark:bg-[#111113] dark:text-white focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                            />
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-medium text-gray-400">
                              <span>Original: {precoBaseOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              {valorBaseAjustadoAtivo && (
                                <span className="text-[#d48997] font-semibold">
                                  {pagamentoAjusteTipo === 'acrescimo' ? 'Acréscimo' : 'Desconto'}: {pagamentoDescontoModo === 'percentual'
                                    ? `${Number.isFinite(descontoDigitado) ? descontoDigitado : 0}%`
                                    : ajusteAplicado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] font-semibold text-[#d48997] dark:text-white">
                              Final do Serviço: {precoBaseCheckout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>

                          <div>
                            <p className="mb-2 text-[10px] font-medium text-gray-400">Observação do Ajuste</p>
                            <textarea
                              value={pagamentoAjusteObservacao}
                              onChange={(e) => setPagamentoAjusteObservacao(e.target.value)}
                              rows={2}
                              placeholder="Motivo do ajuste (ex: cortesia, taxa extra...)"
                              className="w-full resize-none rounded-xl border border-black/[0.08] bg-white px-4.5 py-3.5 text-sm font-medium text-gray-900 outline-none dark:border-white/10 dark:bg-[#111113] dark:text-white focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                            />
                          </div>

                          <div>
                            <p className="mb-2 text-[10px] font-medium text-gray-400">Taxa Adicional da Operadora (Opcional)</p>
                            <input
                              type="number"
                              value={pagamentoTaxa}
                              onChange={(e) => setPagamentoTaxa(e.target.value)}
                              min="0"
                              step="0.01"
                              className="w-full rounded-xl border border-black/[0.08] bg-white px-4.5 py-3 text-sm font-semibold text-gray-900 outline-none dark:border-white/10 dark:bg-[#111113] dark:text-white focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                            />
                          </div>

                          <div className="rounded-2xl border border-black/[0.04] bg-white p-5 dark:border-white/[0.04] dark:bg-white/[0.01] space-y-3">
                            <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 normal-case">
                              <span>Total da Comanda:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{Number(totalGrupoComanda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            {totalPacote > 0 && (
                              <div className="flex justify-between text-xs font-semibold text-[#d48997] normal-case">
                                <span>Coberto por Pacotes:</span>
                                <span className="font-semibold">-{Number(totalPacote).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-semibold text-gray-900 dark:text-white normal-case border-t border-dashed border-black/[0.04] dark:border-white/5 pt-2">
                              <span>A pagar em Dinheiro/Cartão/PIX:</span>
                              <span className="font-semibold">{Number(totalRestante).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-[#d48997] normal-case">
                              <span>Pago Registrado:</span>
                              <span className="font-semibold">{Number(totalManualPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold normal-case border-t border-dashed border-black/[0.04] dark:border-white/5 pt-2">
                              <span>Status da Diferença:</span>
                              {Math.abs(diferencaPagamento) < 0.05 ? (
                                <span className="font-semibold text-emerald-500">Valor Correto</span>
                              ) : diferencaPagamento > 0 ? (
                                <span className="font-semibold text-amber-500">Falta {Number(diferencaPagamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              ) : (
                                <span className="font-semibold text-rose-500">Excesso {Number(Math.abs(diferencaPagamento)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCheckout()}
                            disabled={loading || agendamento.statusPagamento === 'pago' || !caixaPagamentoStatus.aberto || !pagamentoDescontoValido || Math.abs(diferencaPagamento) > 0.05}
                            className="w-full rounded-xl bg-[#E29BA8] hover:bg-[#d48997] py-4 text-xs font-semibold text-white transition-all shadow-md shadow-[#E29BA8]/10 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {loading ? 'Processando...' : 'Finalizar Cobrança'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }


  if (!agendamento) return null;

  return renderSimplifiedModal();

  /*
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 50, opacity: 0 }}
        className="bg-white dark:bg-[#0c0c0e] rounded-t-[2rem] md:rounded-[3rem] xl:rounded-[4rem] w-full max-w-6xl h-[95dvh] md:max-h-[92dvh] xl:h-[85vh] flex flex-col shadow-[0_60px_120px_-20px_rgba(0,0,0,0.7)] border border-gray-200 dark:border-white/5 overflow-y-auto md:overflow-hidden"
      >
        <div className="px-5 py-5 md:px-12 md:py-10 border-b border-gray-100 dark:border-white/5 flex items-start md:items-center justify-between gap-4 bg-white dark:bg-[#0c0c0e]/80 backdrop-blur-3xl sticky top-0 z-10">
           <div className="flex items-start md:items-center gap-4 md:gap-4 sm:p-6 min-w-0">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d48997] to-indigo-700 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-[#E29BA8]/40 relative">
                <User size={30} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#E29BA8] border-4 border-white dark:border-[#0c0c0e] rounded-full" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none break-words">{agendamento.clienteNome}</h2>
                <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2">
                   <span className="text-[10px] font-black text-[#E29BA8] uppercase tracking-[0.3em]">Gestao de Agenda BellaPro</span>
                   {isAgendamentoOnline(agendamento) && (
                     <span className="rounded-full border border-[#14b8a6]/25 bg-[#14b8a6]/12 px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#0f9a8c] dark:text-[#6ee7d8]">
                       Online
                     </span>
                   )}
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/20" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{formatDateBR(agendamento.data)} - {agendamento.inicioHora} - {agendamento.profissional?.nome}</span>
                </div>
              </div>
           </div>
           <button 
             onClick={onClose} 
             className="w-14 h-14 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all hover:scale-110 active:scale-95 group"
           >
             <X size={24} className="group-hover:rotate-90 transition-transform" />
           </button>
        </div>

        <div className="px-5 py-3 md:px-12 md:py-4 bg-bellapro-blush/5 border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className={cn("px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border", STATUS_CONFIG[agendamento.status]?.bg, STATUS_CONFIG[agendamento.status]?.text, STATUS_CONFIG[agendamento.status]?.border)}>
                {STATUS_CONFIG[agendamento.status]?.label || agendamento.status}
              </div>
              {isAgendamentoOnline(agendamento) && (
                <div className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border border-[#14b8a6]/25 bg-[#14b8a6]/12 text-[#0f9a8c] dark:text-[#6ee7d8]">
                  Reserva online
                </div>
              )}
              <div className={cn("px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border", agendamento.statusPagamento === 'pago' ? 'bg-[#E29BA8]/10 text-[#E29BA8] border-[#E29BA8]/20' : 'bg-bellapro-blush/10 text-bellapro-blush border-bellapro-blush/20')}>
                {agendamento.statusPagamento === 'pago' ? 'PAGAMENTO OK' : 'PENDENTE'}
              </div>
           </div>
           <div className="flex flex-wrap items-center justify-end gap-2 md:max-w-[60%]">
              {agendamento.status === 'confirmado' && (
                <button 
                  onClick={async () => {
                    await updateStatusAgendamento(agendamento.id, 'em_atendimento');
                    onUpdate();
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-bellapro-blush text-white text-[9px] font-black uppercase tracking-widest hover:bg-bellapro-blush transition-all shadow-lg shadow-bellapro-blush/20"
                >
                  Iniciar
                </button>
              )}
              {(agendamento.status === 'confirmado' || agendamento.status === 'em_atendimento') && (
                <button 
                  onClick={async () => {
                    await updateStatusAgendamento(agendamento.id, 'concluido');
                    onUpdate();
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#E29BA8] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#d48997] transition-all shadow-lg shadow-[#E29BA8]/20"
                >
                  Concluir
                </button>
              )}
              {agendamento.status !== 'cancelado' && (
                <button 
                  onClick={async () => {
                    if(!confirm('Deseja cancelar este agendamento?')) return;
                    await updateStatusAgendamento(agendamento.id, 'cancelado');
                    onUpdate();
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-500 text-gray-900 dark:text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Cancelar
                </button>
              )}
              {agendamento.status !== 'cancelado' && (
                <button
                  onClick={() => onAjustar?.(agendamento)}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#3b2a35] text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg dark:bg-white/10 dark:text-white"
                >
                  Alterar horario
                </button>
              )}
              {agendamento.statusPagamento === 'pago' && (
                <button
                  onClick={handleReabrirComanda}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-gray-950 text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                >
                  Reabrir Comanda
                </button>
              )}
              <button 
                onClick={() => setTab('pagamento')}
                className="px-4 py-2.5 rounded-xl bg-[#d48997] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#b96a79] transition-all shadow-lg shadow-[#E29BA8]/20"
              >
                Faturar
              </button>
           </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
           <div className="w-full md:w-[450px] md:flex-shrink-0 p-5 md:p-12 bg-gray-50/50 dark:bg-white/[0.01] border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 md:overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex items-center gap-3 mb-10">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Resumo do Checkout</h3>
                 <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
              </div>
              
              <div className="space-y-6 flex-1">
                <div className="bg-white dark:bg-white/5 p-4 md:p-8 rounded-[2rem] border border-[#E29BA8]/20 shadow-2xl shadow-[#E29BA8]/5 relative group">
                   <div className="absolute top-4 right-4 p-2 bg-[#E29BA8]/10 rounded-lg text-[#E29BA8]"><Scissors size={12} /></div>
                   <p className="text-[9px] font-black text-[#E29BA8] uppercase tracking-[0.3em] mb-2">Servico Agendado</p>
                   <p className="text-lg font-black text-gray-900 dark:text-white uppercase leading-tight">{getAgendamentoTitulo(agendamento)}</p>
                   {valorBaseAjustadoAtivo && (
                     <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-bellapro-blush">
                       {pagamentoAjusteTipo === 'acrescimo' ? 'Acrescimo aplicado neste checkout' : 'Desconto aplicado neste checkout'}
                     </p>
                   )}
                   <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Preco do servico</span>
                      <div className="text-right">
                        {valorBaseAjustadoAtivo && (
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 line-through">
                            {precoBaseOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                        <span className="font-black text-gray-900 dark:text-white">{precoBaseCheckout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={14} className="text-[#E29BA8]" />
                    <p className="text-[9px] font-black text-[#E29BA8] uppercase tracking-[0.3em]">Observacao do agendamento</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {agendamento.observacao?.trim() || 'Nenhuma observacao registrada para este atendimento.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={14} className="text-[#E29BA8]" />
                    <p className="text-[9px] font-black text-[#E29BA8] uppercase tracking-[0.3em]">Motivo do ajuste</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {pagamentoAjusteObservacao.trim() || 'Nenhuma observacao registrada para este ajuste.'}
                  </p>
                </div>

                {agendamentosMesmoClienteNoDia.length > 1 && (
                  <div className="bg-white dark:bg-white/5 p-4 md:p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black text-[#E29BA8] uppercase tracking-[0.3em]">Comanda agrupada</p>
                        <h4 className="mt-2 text-lg font-black text-gray-900 dark:text-white uppercase">
                          {agendamentosMesmoClienteNoDia.length} procedimentos no dia
                        </h4>
                      </div>
                      <p className="text-sm font-black text-[#d48997]">
                        {calculateGroupedAgendamentosTotal(agendamentosMesmoClienteNoDia).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {agendamentosMesmoClienteNoDia.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 rounded-[1.25rem] bg-gray-50 dark:bg-white/[0.04] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-900 dark:text-white">
                              {item.inicioHora} · {getAgendamentoTitulo(item)}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                              {item.profissional?.nome || 'Equipe'} · {item.statusPagamento === 'pago' ? 'Pago' : 'Pendente'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const descontoPadrao = getCheckoutDiscountDefaults(item);
                                setPagamentoDescontoModo(descontoPadrao.modo);
                                setPagamentoDesconto(descontoPadrao.valor);
                                setAgendamento(item);
                              }}
                              className="rounded-xl border border-gray-200 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 transition hover:bg-white dark:border-white/10 dark:text-white/70"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => onAjustar?.(item)}
                              className="rounded-xl border border-[#d48997]/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#d48997] transition hover:bg-[#d48997]/10"
                            >
                              Ajustar
                            </button>
                            {agendamentosMesmoClienteNoDia.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleExcluirAgendamentoDaComanda(item)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-red-500 transition hover:bg-red-50"
                              >
                                Remover
                              </button>
                            )}
                            <p className="ml-auto text-sm font-black text-gray-900 dark:text-white xl:ml-3">
                              {calculateAgendamentoTotal(item).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {itensExtras.length > 0 && (
                  <div className="space-y-4">
                    {itensExtras.map(item => (
                      <motion.div 
                        key={item.id} 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-white dark:bg-white/5 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:border-[#E29BA8]/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-[#E29BA8]/10 rounded-xl flex items-center justify-center text-[#E29BA8]"><Plus size={16} /></div>
                           <div>
                             <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">{item.servico?.nome || item.nome}</p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Servico Extra</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <p className="font-black text-gray-900 dark:text-white text-sm">{Number(item.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                           <button onClick={() => handleRemoveItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><Trash2 size={14} /></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {agendamento?.produtos?.length > 0 && (
                  <div className="space-y-4">
                    {agendamento.produtos.map(p => (
                      <motion.div 
                        key={p.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-white dark:bg-white/5 p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:border-[#E29BA8]/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-[#E29BA8]/10 rounded-xl flex items-center justify-center text-[#E29BA8]"><ShoppingBag size={16} /></div>
                           <div>
                             <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">{p.produto?.nome || p.nome} <span className="text-[#E29BA8]">x{p.quantidade}</span></p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Produto / Venda</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <p className="font-black text-gray-900 dark:text-white text-sm">{Number((p.preco || 0) * (p.quantidade || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                           <button onClick={() => handleRemoveProduto(p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><Trash2 size={14} /></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-12 pt-10 border-t-2 border-dashed border-gray-200 dark:border-white/10">
                 <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Subtotal Bruto</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white uppercase">{Number(calculateTotal()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
                 <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Valor Final</p>
                    <p className="text-3xl sm:text-5xl font-black text-[#d48997] tracking-tighter drop-shadow-2xl">{Number(calculateTotal()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                 </div>
              </div>
           </div>

           <div className="flex-1 min-h-0 p-5 md:p-12 md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#060608]">
              <div className="sticky top-0 z-[1] mb-8 md:mb-12 bg-white/95 dark:bg-[#060608]/95 backdrop-blur px-1 py-1 rounded-[2rem]">
              <div className="flex p-2 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                <button 
                  onClick={() => setTab('comanda')} 
                  className={cn(
                    "flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3",
                    tab === 'comanda' ? "bg-white dark:bg-[#d48997] shadow-2xl text-[#d48997] dark:text-white" : "text-gray-400"
                  )}
                >
                  <Plus size={14} /> Adicionar Itens a Comanda
                </button>
                {agendamento.statusPagamento === 'pago' ? (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 bg-[#E29BA8]/10 text-[#d48997] border border-[#E29BA8]/20">
                      <CheckCircle2 size={14} /> Pagamento Confirmado
                    </div>
                    <button 
                      onClick={() => {
                        const total = calculateAgendamentoTotal(agendamento);
                        const itensArr = [
                          agendamento.servico?.nome || agendamento.pacote?.nome,
                          ...itensExtras.map((i) => i.servico?.nome || i.nome),
                          ...(agendamento.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                        ].filter(Boolean);
                        const itensStr = itensArr.join(', ');
                        
                        const msg = encodeURIComponent(
                          `*REENVIO DE COMPROVANTE*\n\n` +
                          `Ola, *${agendamento.clienteNome}*!\n` +
                          `Segue o seu comprovante de atendimento.\n\n` +
                          `*Detalhes:*\n${itensStr}\n` +
                          `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                          `Agradecemos a preferencia!`
                        );
                        window.open(`https://wa.me/55${agendamento.clienteTelefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                      }}
                      className="px-6 py-5 rounded-[2rem] bg-[#25D366] text-white font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-[#E29BA8]/10 hover:scale-[1.02] transition-all"
                    >
                      <MessageSquare size={14} /> Reenviar
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      refreshCaixaPagamentoStatus();
                      setTab('pagamento');
                    }} 
                    className={cn(
                      "flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3",
                      tab === 'pagamento' ? "bg-white dark:bg-[#d48997] shadow-2xl text-[#d48997] dark:text-white" : "text-gray-400"
                    )}
                  >
                    <CreditCard size={14} /> Finalizar Checkout
                  </button>
                )}
              </div>
              </div>

              {tab === 'comanda' ? (
                <div className="space-y-12">
                   <section className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                            <MessageSquare size={14} className="text-[#E29BA8]" /> Observacao
                          </h4>
                          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Use para anotar pedidos do cliente, formula, cor, orientacoes ou qualquer detalhe interno.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSalvarObservacao}
                          disabled={savingObservacao}
                          className="shrink-0 rounded-2xl bg-[#E29BA8] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[#d48997] disabled:opacity-60"
                        >
                          {savingObservacao ? 'Salvando' : 'Salvar'}
                        </button>
                      </div>

                      <textarea
                        value={observacaoDraft}
                        onChange={(event) => setObservacaoDraft(event.target.value)}
                        rows={4}
                        placeholder="Ex.: cliente pediu tonalidade rosa, teste de mecha, alergia, observacao da profissional..."
                        className="w-full rounded-[1.75rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                   </section>

                   <section className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em]">
                            Novo item da comanda
                          </h4>
                          <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Inclua outro servico com profissional e horario proprios, mantendo o mesmo checkout.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddItemNaComanda}
                          disabled={!novoItemComanda.servicoId || !novoItemComanda.profissionalId || !novoItemComanda.hora}
                          className="shrink-0 rounded-2xl bg-[#d48997] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[#c77787] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <select
                          value={novoItemComanda.servicoId}
                          onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, servicoId: event.target.value, profissionalId: '' }))}
                          className="w-full rounded-[1.75rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm text-gray-900 dark:text-white outline-none"
                        >
                          <option value="">Selecione o servico</option>
                          {servicos.map((servico) => (
                            <option key={servico.id} value={servico.id}>{servico.nome}</option>
                          ))}
                        </select>

                        <select
                          value={novoItemComanda.profissionalId}
                          onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, profissionalId: event.target.value }))}
                          className="w-full rounded-[1.75rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm text-gray-900 dark:text-white outline-none"
                        >
                          <option value="">Selecione o profissional</option>
                          {profissionaisCompativeisNovoItem.map((profissional) => (
                            <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>
                          ))}
                        </select>

                        <input
                          type="time"
                          value={novoItemComanda.hora}
                          onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, hora: event.target.value }))}
                          className="w-full rounded-[1.75rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm text-gray-900 dark:text-white outline-none"
                        />

                        <input
                          value={novoItemComanda.observacao}
                          onChange={(event) => setNovoItemComanda((prev) => ({ ...prev, observacao: event.target.value }))}
                          placeholder="Observacao do novo item"
                          className="w-full rounded-[1.75rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
                        />
                      </div>

                      <p className="mt-4 text-[11px] font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                        O novo item entra na mesma comanda deste cliente, mas com profissional e horario proprios.
                      </p>
                   </section>

                   <section>
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E29BA8]" /> Servicos Adicionais
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{servicosFiltrados.length} DISPONIVEIS</span>
                          <button
                            type="button"
                            onClick={() => setServicosExpandido((prev) => !prev)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-300"
                          >
                            {servicosExpandido ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="mb-5 flex items-center gap-3 rounded-[1.75rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-4 py-3">
                        <Search size={16} className="text-gray-400" />
                        <input
                          value={servicosBusca}
                          onChange={(event) => setServicosBusca(event.target.value)}
                          placeholder="Buscar servico por nome"
                          className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
                        />
                      </div>
                      {servicosExpandido ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                         {servicosFiltrados.map((s) => (
                           <motion.button 
                             key={s.id} 
                             whileHover={{ scale: 1.05, y: -5 }}
                             onClick={() => handleAddItem(s.id)} 
                             className="text-left p-4 sm:p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-transparent hover:border-[#E29BA8]/40 transition-all group relative overflow-hidden"
                           >
                              <div className="absolute top-0 left-0 w-1 h-full bg-[#d48997] opacity-0 group-hover:opacity-100 transition-opacity" />
                              <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate mb-1">{s.nome}</p>
                              <p className="text-[10px] font-bold text-[#E29BA8] uppercase tracking-widest">{Number(s.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">{formatDurationLabel(s.duracaoMin)}</p>
                           </motion.button>
                         ))}
                      </div>
                      ) : (
                        <div className="rounded-[2rem] border border-dashed border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.03] px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          Lista de servicos recolhida. Toque no icone para expandir novamente.
                        </div>
                      )}
                      {servicosExpandido && servicosFiltrados.length === 0 ? (
                        <div className="rounded-[2rem] border border-dashed border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.03] px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          Nenhum servico encontrado com esse filtro.
                        </div>
                      ) : (
                        null
                      )}
                   </section>

                   <section>
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E29BA8]" /> Produtos & Bar
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{produtosFiltrados.length} PRODUTOS</span>
                          <button
                            type="button"
                            onClick={() => setProdutosExpandido((prev) => !prev)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-300"
                          >
                            {produtosExpandido ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="mb-5 flex items-center gap-3 rounded-[1.75rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-4 py-3">
                        <Search size={16} className="text-gray-400" />
                        <input
                          value={produtosBusca}
                          onChange={(event) => setProdutosBusca(event.target.value)}
                          placeholder="Buscar produto por nome"
                          className="w-full bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
                        />
                      </div>
                      {produtosExpandido ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                         {produtosFiltrados.map(p => (
                           <motion.button 
                             key={p.id} 
                             whileHover={{ scale: 1.05, y: -5 }}
                             onClick={() => handleAddProduto(p.id)} 
                             className="text-left p-4 sm:p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-transparent hover:border-[#E29BA8]/40 transition-all group relative overflow-hidden"
                           >
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase truncate mb-1">{p.nome}</p>
                              <p className="text-[10px] font-bold text-[#E29BA8] uppercase tracking-widest">{Number(p.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                           </motion.button>
                         ))}
                      </div>
                      ) : (
                        <div className="rounded-[2rem] border border-dashed border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.03] px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          Lista de produtos recolhida. Toque no icone para expandir novamente.
                        </div>
                      )}
                      {produtosExpandido && produtosFiltrados.length === 0 ? (
                        <div className="rounded-[2rem] border border-dashed border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.03] px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          Nenhum produto encontrado com esse filtro.
                        </div>
                      ) : (
                        null
                      )}
                   </section>
                </div>
              ) : (
                <div className="space-y-12 py-6">
                   {concluidoSucesso ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-5 md:p-10 text-center">
                        <div className="w-24 h-24 bg-[#E29BA8] rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-[#E29BA8]/20">
                           <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Pago com Sucesso!</h2>
                        <p className="text-gray-500 text-lg mb-12 max-w-sm font-medium">O atendimento foi concluido e os valores foram integrados ao seu financeiro BellaPro.</p>
                        
                        <div className="w-full max-w-md space-y-4">
                          <button 
                            onClick={() => {
                              const total = calculateTotal();
                              const itens = [
                                agendamento.servico?.nome || agendamento.pacote?.nome,
                                ...itensExtras.map((i) => i.servico?.nome || i.nome),
                                ...(agendamento.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                              ].filter(Boolean).join(', ');
                              
                              const msg = encodeURIComponent(
                                `*COMPROVANTE DE ATENDIMENTO*\n\n` +
                                `Ola, *${agendamento.clienteNome}*!\n` +
                                `Seu atendimento foi finalizado com sucesso.\n\n` +
                                `*Detalhes:*\n${itens}\n` +
                                `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                                `Agradecemos a preferencia!`
                              );
                              window.open(`https://wa.me/55${agendamento.clienteTelefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                            }}
                            className="w-full py-6 rounded-[2rem] bg-[#25D366] text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 shadow-xl shadow-[#E29BA8]/10 hover:scale-[1.02] transition-all"
                          >
                             <MessageSquare size={20} /> Enviar Comprovante WhatsApp
                          </button>
                          <button 
                            onClick={onClose}
                            className="w-full py-6 rounded-[2rem] bg-gray-100 dark:bg-white/5 text-gray-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                          >
                             Voltar para Agenda
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-center space-y-6 max-w-md mx-auto">
                           <div className="w-24 h-24 bg-[#E29BA8] rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-[#E29BA8]/30 relative">
                             <DollarSign size={40} />
                             <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 border-4 border-[#E29BA8] rounded-[2rem] scale-110 opacity-30" />
                           </div>
                           <div>
                             <h3 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">Checkout Final</h3>
                             <p className="text-gray-500 text-sm font-medium mt-3">Finalize a experiencia do cliente e lance os valores no fluxo financeiro BellaPro.</p>
                           </div>
                        </div>

                        <div className="max-w-2xl mx-auto space-y-6">
                           {!caixaPagamentoStatus.aberto && (
                             <div className="rounded-[2rem] border border-amber-300/30 bg-amber-400/10 px-5 py-4 text-sm font-semibold text-amber-100">
                               {caixaPagamentoStatus.mensagem || 'Abra o caixa antes de registrar pagamentos.'}
                             </div>
                           )}

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {[
                               { label: 'PIX', forma: 'PIX', icon: Smartphone, color: 'text-[#E29BA8]' },
                               { label: 'Cartao de Credito', forma: 'Cartao de Credito', icon: CreditCard, color: 'text-[#E29BA8]' },
                               { label: 'Cartao de Debito', forma: 'Cartao de Debito', icon: CreditCard, color: 'text-indigo-500' },
                               { label: 'Dinheiro', forma: 'Dinheiro', icon: Banknote, color: 'text-bellapro-blush' }
                             ].map(item => (
                               <button
                                 key={item.forma}
                                 type="button"
                                 onClick={() => setPagamentoForma(item.forma)}
                                 className={cn(
                                   'p-4 sm:p-6 rounded-[2rem] border text-left transition-all',
                                   pagamentoForma === item.forma
                                     ? 'bg-[#d48997] border-[#d48997] shadow-2xl text-white'
                                     : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-[#E29BA8]/30'
                                 )}
                               >
                                 <div className="flex items-center gap-4">
                                   <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-gray-800', pagamentoForma === item.forma ? 'text-gray-900 dark:text-white bg-white/10' : item.color)}>
                                     <item.icon size={22} />
                                   </div>
                                   <div>
                                     <p className={cn('text-sm font-black uppercase tracking-widest', pagamentoForma === item.forma ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white')}>{item.label}</p>
                                     <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em] mt-1', pagamentoForma === item.forma ? 'text-gray-600 dark:text-white/70' : 'text-gray-400')}>Cobranca rapida</p>
                                   </div>
                                 </div>
                               </button>
                             ))}
                           </div>

                           <div className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4 sm:p-6 space-y-4">
                             <div>
                               <div className="mb-2 flex items-center justify-between gap-3">
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Ajuste no servico</p>
                                 <div className="flex flex-wrap items-center justify-end gap-2">
                                   {[
                                     { id: 'desconto', label: 'Desconto' },
                                     { id: 'acrescimo', label: 'Acrescimo' },
                                   ].map((tipo) => (
                                     <button
                                       key={tipo.id}
                                       type="button"
                                       onClick={() => setPagamentoAjusteTipo(tipo.id)}
                                       className={cn(
                                         'rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                                         pagamentoAjusteTipo === tipo.id
                                           ? 'border-[#d48997] bg-[#d48997] text-white'
                                           : 'border-gray-200 text-gray-500 hover:border-[#d48997]/30 dark:border-white/10 dark:text-white/70'
                                       )}
                                     >
                                       {tipo.label}
                                     </button>
                                   ))}
                                   {[
                                     { id: 'valor', label: 'R$' },
                                     { id: 'percentual', label: '%' },
                                   ].map((modo) => (
                                     <button
                                       key={modo.id}
                                       type="button"
                                       onClick={() => setPagamentoDescontoModo(modo.id)}
                                       className={cn(
                                         'rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                                         pagamentoDescontoModo === modo.id
                                           ? 'border-[#d48997] bg-[#d48997] text-white'
                                           : 'border-gray-200 text-gray-500 hover:border-[#d48997]/30 dark:border-white/10 dark:text-white/70'
                                       )}
                                     >
                                       {modo.label}
                                     </button>
                                   ))}
                                   <button
                                     type="button"
                                     onClick={() => {
                                       setPagamentoAjusteTipo('desconto');
                                       setPagamentoDescontoModo('valor');
                                       setPagamentoDesconto('');
                                       setPagamentoAjusteObservacao('');
                                     }}
                                     className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d48997] transition hover:text-[#b96a79]"
                                   >
                                     Restaurar original
                                   </button>
                                 </div>
                               </div>
                               <input
                                 type="number"
                                 value={pagamentoDesconto}
                                 onChange={(e) => setPagamentoDesconto(e.target.value)}
                                 min="0"
                                 max={pagamentoDescontoModo === 'percentual' ? '100' : undefined}
                                 step={pagamentoDescontoModo === 'percentual' ? '1' : '0.01'}
                                 placeholder={pagamentoDescontoModo === 'percentual' ? '0' : '0,00'}
                                 className="w-full rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none"
                               />
                               <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em]">
                                 <span className="text-gray-400">Original {precoBaseOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                 {valorBaseAjustadoAtivo && (
                                   <span className="text-bellapro-blush">
                                     {pagamentoAjusteTipo === 'acrescimo' ? 'Acrescimo' : 'Desconto'} {pagamentoDescontoModo === 'percentual'
                                       ? `${Number.isFinite(descontoDigitado) ? descontoDigitado : 0}%`
                                       : ajusteAplicado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                   </span>
                                 )}
                               </div>
                               <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                                 Final do servico {precoBaseCheckout.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                               </p>
                             </div>

                             <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Observacao do ajuste</p>
                               <textarea
                                 value={pagamentoAjusteObservacao}
                                 onChange={(e) => setPagamentoAjusteObservacao(e.target.value)}
                                 rows={3}
                                 placeholder="Ex.: desconto por cortesia, acrescimo por horario especial..."
                                 className="w-full resize-none rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm font-medium text-gray-900 dark:text-white outline-none"
                               />
                             </div>

                             <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Taxa da Maquininha</p>
                               <input
                                 type="number"
                                 value={pagamentoTaxa}
                                 onChange={(e) => setPagamentoTaxa(e.target.value)}
                                 min="0"
                                 step="0.01"
                                 className="w-full rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#111113] px-5 py-4 text-sm font-black text-gray-900 dark:text-white outline-none"
                               />
                             </div>

                             <div className="flex items-center justify-between pt-4">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Total para cobrar</p>
                               <p className="text-2xl font-black text-gray-900 dark:text-white">{Number(calculateTotal()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                             </div>

                              <button
                                type="button"
                                onClick={() => handleCheckout(pagamentoForma)}
                                disabled={!pagamentoForma || loading || agendamento.statusPagamento === 'pago' || !caixaPagamentoStatus.aberto || !pagamentoDescontoValido}
                                className="w-full rounded-[2rem] bg-[#E29BA8] hover:bg-[#d48997] disabled:opacity-40 disabled:cursor-not-allowed text-white py-6 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#E29BA8]/20 transition-all flex items-center justify-center gap-3 mt-4"
                              >
                               <CheckCircle2 size={18} /> {agendamento.statusPagamento === 'pago' ? 'Ja pago' : 'Finalizar cobranca'}
                             </button>
                           </div>
                        </div>
                      </>
                    )}
                </div>
              )}
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
  */
}

function ModalBloqueioPeriodo({ onClose, onSave, data, horaInicial, profissionalNome }) {
  const [form, setForm] = useState({
    inicioHora: horaInicial || '',
    fimHora: addMinutesToTime(horaInicial, 60),
    motivo: '',
  });
  const [saving, setSaving] = useState(false);

  async function salvar(e) {
    e.preventDefault();

    if (!form.inicioHora || !form.fimHora) {
      alert('Informe inicio e fim para bloquear um periodo.');
      return;
    }

    if (form.fimHora <= form.inicioHora) {
      alert('O horario final precisa ser maior que o horario inicial.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        inicioHora: form.inicioHora,
        fimHora: form.fimHora,
        motivo: form.motivo.trim(),
      });
    } catch (error) {
      alert(error.message || 'Nao foi possivel salvar o bloqueio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl"
    >
      <motion.form
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={salvar}
        className="w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] dark:border-white/10 dark:bg-[#121214]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d48997]">Bloqueio por periodo</p>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">Definir intervalo</h3>
            <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-300">
              {profissionalNome} em {formatDateBR(data)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-red-500 dark:bg-white/5 dark:text-white/70"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Inicio</label>
            <input
              type="time"
              value={form.inicioHora}
              onChange={(e) => setForm((prev) => ({ ...prev, inicioHora: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 font-black text-gray-900 outline-none transition-all focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Fim</label>
            <input
              type="time"
              value={form.fimHora}
              onChange={(e) => setForm((prev) => ({ ...prev, fimHora: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 font-black text-gray-900 outline-none transition-all focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
              required
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="ml-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Motivo</label>
            <input
              value={form.motivo}
              onChange={(e) => setForm((prev) => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ex: Almoco, reuniao, atendimento externo..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 font-black text-gray-900 outline-none transition-all focus:border-[#d48997] dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 px-5 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 transition-all hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-2xl bg-[#d48997] px-5 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-[#d48997]/30 transition-all hover:bg-[#c77787] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Confirmar bloqueio'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function Agenda() {
  const [isMounting, setIsMounting] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const location = useLocation();
  const [profissionais, setProfissionais] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [listaEspera, setListaEspera] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(formatDateInput());
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [prefillAgendaData, setPrefillAgendaData] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(null);
  const [modalBloqueioPeriodo, setModalBloqueioPeriodo] = useState(null);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [pendingAgendamentoId, setPendingAgendamentoId] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dataQuery = params.get('data');
    const agendamentoQuery = params.get('agendamento') || '';

    if (dataQuery) {
      setDataFiltro(dataQuery);
    }

    setPendingAgendamentoId(agendamentoQuery);

    if (params.get('novoAgendamento') === '1') {
      const pNome = params.get('nome') || '';
      const pTel = params.get('telefone') || '';
      if (pNome || pTel) {
        setPrefillAgendaData({
          clienteNome: pNome,
          clienteTelefone: pTel,
        });
        setModalNovo(true);
      }
    }
  }, [location.search]);
  const [contextMenu, setContextMenu] = useState(null);

  const [colWidth, setColWidth] = useState(200);
  const [hourHeight, setHourHeight] = useState(80);
  const [profVisiveis, setProfVisiveis] = useState({});
  const [draggedProfId, setDraggedProfId] = useState('');
  const [dragOverProfId, setDragOverProfId] = useState('');
  const [savingProfessionalOrder, setSavingProfessionalOrder] = useState(false);
  // Se??o visual BellaPro
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [preFill, setPreFill] = useState({ hora: '', profId: '' });
  const gridRef = React.useRef(null);

  // Se??o visual BellaPro
  useEffect(() => {
    if (gridRef.current && profissionais.length > 0) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        const scrollPos = (currentHour - START_HOUR) * hourHeight - 100;
        gridRef.current.scrollTop = Math.max(0, scrollPos);
      }
    }
  }, [loading, profissionais, hourHeight]);

  async function carregar() {
    setLoading(true);
    try {
      const [rp, ra, rl] = await Promise.all([
        getProfissionais(), 
        getAgendamentos({ data: dataFiltro }),
        getListaEspera({ status: 'aberta' })
      ]);
      
      const profs = (rp?.data || []).filter(p => p.ativo);
      setProfissionais(profs);
      setAgendamentos(ra?.data?.agendamentos || []);
      setBloqueios(ra?.data?.bloqueios || []);
      setListaEspera(rl?.data || []);
      
      // Se??o visual BellaPro
      const hasSelection = Object.values(profVisiveis).some(v => v);
      if (!hasSelection && profs.length > 0) {
        const obj = {};
        profs.forEach(p => obj[p.id] = true);
        setProfVisiveis(obj);
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [dataFiltro]);
  useEffect(() => {
    if (!pendingAgendamentoId || agendamentos.length === 0) return;

    const alvo = agendamentos.find((item) => item.id === pendingAgendamentoId);
    if (!alvo) return;

    setAgendamentoSelecionado(alvo);
    setModalDetalhes(true);
    setPendingAgendamentoId('');
  }, [pendingAgendamentoId, agendamentos]);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getPosition = (horaStr, duracaoTotal) => {
    const [h, m] = (horaStr || '00:00').split(':').map(Number);
    const top = (h - START_HOUR) * hourHeight + (m / 60) * hourHeight;
    const height = (duracaoTotal / 60) * hourHeight;
    return { top, height };
  };

  const getBloqueioRenderWindow = (bloqueio) => {
    if (!bloqueio?.inicioHora || !bloqueio?.fimHora) {
      return {
        inicioHora: `${String(START_HOUR).padStart(2, '0')}:00`,
        fimHora: `${String(END_HOUR + 1).padStart(2, '0')}:00`,
      };
    }

    return {
      inicioHora: bloqueio.inicioHora,
      fimHora: bloqueio.fimHora,
    };
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const profsDisplay = (profissionais || []).filter(p => profVisiveis[p.id]);
  const mobileColWidth = 164;
  const mobileHourHeight = 92;

  const handleGridClick = (e, profId, hour) => {
    const menuWidth = 196;
    const menuHeight = 260;
    const margin = 8;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || menuWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || menuHeight;

    setContextMenu({
      x: Math.min(Math.max(e.clientX, margin), Math.max(margin, viewportWidth - menuWidth)),
      y: Math.min(Math.max(e.clientY, margin), Math.max(margin, viewportHeight - menuHeight)),
      profId,
      hora: `${String(hour).padStart(2, '0')}:00`
    });
  };

  const handleProfessionalDragStart = (profId) => (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', profId);
    setDraggedProfId(profId);
    setDragOverProfId(profId);
  };

  const handleProfessionalDragOver = (profId) => (event) => {
    if (!draggedProfId || draggedProfId === profId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverProfId(profId);
  };

  const handleProfessionalDrop = (profId) => async (event) => {
    event.preventDefault();
    const sourceId = draggedProfId || event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === profId) {
      setDraggedProfId('');
      setDragOverProfId('');
      return;
    }

    const previous = profissionais;
    const next = reorderProfessionalsList(profissionais, sourceId, profId);
    if (next === previous) {
      setDraggedProfId('');
      setDragOverProfId('');
      return;
    }

    setProfissionais(next);
    setDraggedProfId('');
    setDragOverProfId('');
    setSavingProfessionalOrder(true);

    try {
      await reorderProfissionais(next.map((item) => item.id));
    } catch (error) {
      console.error('Erro ao salvar ordem dos profissionais:', error);
      setProfissionais(previous);
      alert(error.response?.data?.error || 'Nao foi possivel salvar a ordem da equipe.');
    } finally {
      setSavingProfessionalOrder(false);
    }
  };

  const handleProfessionalDragEnd = () => {
    setDraggedProfId('');
    setDragOverProfId('');
  };

  async function handleBloquear() {
    if (!contextMenu) return;
    const motivo = prompt('Motivo do bloqueio (opcional):');
    if (motivo === null) return;
    try {
      await createBloqueio({
        profissionalId: contextMenu.profId,
        data: dataFiltro,
        inicioHora: contextMenu.hora,
        fimHora: addMinutesToTime(contextMenu.hora, 60),
        motivo
      });
      carregar();
    } catch (e) {
      console.error('Erro ao bloquear horario:', e);
      alert(getApiErrorMessage(e, 'Erro ao bloquear'));
    }
    setContextMenu(null);
  }

  async function handleBloquearPeriodo({ inicioHora, fimHora, motivo }) {
    if (!modalBloqueioPeriodo) return;
    try {
      await createBloqueio({
        profissionalId: modalBloqueioPeriodo.profId,
        data: dataFiltro,
        inicioHora,
        fimHora,
        motivo: motivo || null,
      });
      setModalBloqueioPeriodo(null);
      carregar();
    } catch (e) {
      throw new Error(getApiErrorMessage(e, 'Erro ao bloquear periodo'));
    }
  }

  async function handleBloquearDiaTodo() {
    if (!contextMenu) return;
    const motivo = prompt('Motivo do bloqueio do dia inteiro (opcional):');
    if (motivo === null) return;
    try {
      await createBloqueio({
        profissionalId: contextMenu.profId,
        data: dataFiltro,
        inicioHora: null,
        fimHora: null,
        motivo,
      });
      carregar();
    } catch (e) {
      console.error('Erro ao bloquear dia inteiro:', e);
      alert(getApiErrorMessage(e, 'Erro ao bloquear o dia inteiro'));
    }
    setContextMenu(null);
  }

  async function handleDesbloquearBloqueio(bloqueio, event) {
    event?.stopPropagation?.();
    const profissionalNome = profissionais.find((profissional) => profissional.id === bloqueio.profissionalId)?.nome || bloqueio.profissional?.nome || 'profissional';
    const periodo = bloqueio.inicioHora && bloqueio.fimHora
      ? `${bloqueio.inicioHora} - ${bloqueio.fimHora}`
      : 'dia inteiro';
    const confirmar = window.confirm(`Desfazer bloqueio de ${profissionalNome} (${periodo})?`);
    if (!confirmar) return;

    try {
      await deleteBloqueio(bloqueio.id);
      await carregar();
    } catch (error) {
      console.error('Erro ao desfazer bloqueio:', error);
      alert(getApiErrorMessage(error, 'Nao foi possivel desfazer o bloqueio.'));
    }
  }

  async function adicionarListaEsperaRapida() {
    const clienteNome = window.prompt('Nome do cliente para lista de espera:');
    if (!clienteNome) return;
    const clienteTelefone = window.prompt('Telefone do cliente:');
    if (!clienteTelefone) return;
    const servicoId = profissionais[0]?.servicos?.[0]?.servicoId || '';

    try {
      await createListaEspera({
        clienteNome,
        clienteTelefone,
        servicoId: servicoId || undefined,
        dataDesejada: dataFiltro,
        observacao: 'Entrada rapida pela agenda',
      });
      carregar();
    } catch (e) {
      alert('Erro ao adicionar na lista de espera');
    }
  }

  async function removerDaListaEspera(id) {
    if (!window.confirm('Remover este cliente da lista de espera?')) return;
    await deleteListaEspera(id);
    carregar();
  }

  if (isMounting) return (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0c]">
      <div className="w-10 h-10 border-4 border-[#ecd5d9] border-t-[#d48997] rounded-full animate-spin"></div>
    </div>
  );

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0c]">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
         <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-4 border-[#E29BA8]/20 rounded-full" />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-4 border-[#d48997] border-t-transparent rounded-full" />
         </div>
         <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">Sincronizando Agenda...</p>
       </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="agenda-page h-full flex bg-gray-50 dark:bg-bellapro-ink relative overflow-hidden"
    >
      {/* Se??o BellaPro */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d48997]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {modalNovo && (
          <ModalNovoAgendamento 
            onSave={() => { setModalNovo(false); carregar(); setPreFill({ hora: '', profId: '' }); setPrefillAgendaData(null); }} 
            onClose={() => { setModalNovo(false); setPreFill({ hora: '', profId: '' }); setPrefillAgendaData(null); }} 
            preData={dataFiltro}
            preHora={preFill.hora}
            preProf={preFill.profId}
            prefillData={prefillAgendaData}
          />
        )}
        {modalBloqueioPeriodo && (
          <ModalBloqueioPeriodo
            data={dataFiltro}
            horaInicial={modalBloqueioPeriodo.hora}
            profissionalNome={profissionais.find((profissional) => profissional.id === modalBloqueioPeriodo.profId)?.nome || 'Profissional'}
            onSave={handleBloquearPeriodo}
            onClose={() => setModalBloqueioPeriodo(null)}
          />
        )}
        {modalAjuste && (
          <ModalAjusteAgendamento
            agendamento={modalAjuste}
            profissionais={profissionais}
            onClose={() => setModalAjuste(null)}
            onSave={async (form) => {
              try {
                await updateAgendamentoAdmin(modalAjuste.id, form);
                setModalAjuste(null);
                await carregar();
              } catch (error) {
                window.alert(error?.response?.data?.error || 'Nao foi possivel ajustar o agendamento.');
              }
            }}
          />
        )}
        {modalDetalhes && agendamentoSelecionado && (
          <ModalDetalhesAgendamento 
            agendamento={agendamentoSelecionado} 
            allAgendamentos={agendamentos}
            onUpdate={(updatedAgendamento) => {
              if (updatedAgendamento?.id) {
                setAgendamentos((prev) => prev.map((item) => item.id === updatedAgendamento.id ? updatedAgendamento : item));
                setAgendamentoSelecionado(updatedAgendamento);
              } else {
                carregar();
              }
            }} 
            onAjustar={(agendamento) => {
              setModalDetalhes(false);
              setModalAjuste(agendamento);
            }}
            onClose={() => { setModalDetalhes(false); setAgendamentoSelecionado(null); }} 
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={false} 
        animate={{ width: sidebarOpen ? 280 : 0 }} 
        className="bg-gradient-to-b from-white/90 to-white/75 dark:from-[#0d0d10]/95 dark:to-[#09090b]/90 backdrop-blur-3xl border-r border-black/[0.03] dark:border-white/[0.03] flex flex-col z-[60] shrink-0 shadow-[20px_0_60px_-20px_rgba(0,0,0,0.05)] dark:shadow-none overflow-hidden"
      >
        <div className="p-4 md:p-8 space-y-8 w-[280px]">
          <div>
            <h3 className="text-xl font-serif font-normal text-gray-900 dark:text-white tracking-wide mb-1">Escala</h3>
            <p className="text-[8px] font-bold text-[#d48997] uppercase tracking-[0.2em] bg-[#d48997]/10 px-2.5 py-1 rounded-md inline-flex">Customização Visual</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-6 p-4 sm:p-5 bg-white/40 dark:bg-white/[0.01] rounded-3xl border border-black/[0.03] dark:border-white/[0.03] shadow-inner shadow-gray-200/10">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Largura Coluna</span>
                  <span className="text-[#d48997] font-semibold">{colWidth}px</span>
                </div>
                <input type="range" min="140" max="300" value={colWidth} onChange={e => setColWidth(Number(e.target.value))} className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d48997]" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>Altura Hora</span>
                  <span className="text-[#d48997] font-semibold">{hourHeight}px</span>
                </div>
                <input type="range" min="50" max="150" value={hourHeight} onChange={e => setHourHeight(Number(e.target.value))} className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d48997]" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Target size={12} className="text-[#E29BA8]"/> Lista de Espera</h4>
                <button onClick={adicionarListaEsperaRapida} className="px-2 py-1 bg-[#E29BA8]/10 text-[#d48997] rounded-md text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-[#E29BA8]/20">
                  Novo
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[28vh] overflow-y-auto pr-2 custom-scrollbar">
                {(listaEspera || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.04] dark:border-white/5 px-4 py-4 text-[10px] font-medium tracking-wider text-gray-400 dark:text-gray-500">
                    Nenhum cliente aguardando
                  </div>
                ) : (
                  (listaEspera || []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-black/[0.03] dark:border-white/5 bg-white/40 dark:bg-white/[0.01] px-4 py-4 hover:shadow-md transition-all duration-300">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{item.clienteNome}</p>
                      <p className="mt-1 text-[10px] font-normal text-gray-400 dark:text-gray-500">
                        {item.servico?.nome || 'Sem serviço definido'}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPrefillAgendaData({
                              clienteNome: item.clienteNome,
                              clienteTelefone: item.clienteTelefone,
                              profissionalId: item.profissionalId || '',
                              servicoIds: item.servicoId ? [item.servicoId] : [],
                            });
                            setModalNovo(true);
                          }}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#d48997] to-[#e29ba8] px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm hover:opacity-90"
                        >
                          Agendar
                        </button>
                        <button
                          onClick={() => removerDaListaEspera(item.id)}
                          className="rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:border-red-200 hover:text-red-500 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-[#E29BA8]"/> Equipe</h4>
                <div className="px-2 py-1 bg-[#d48997]/10 text-[#d48997] rounded-md text-[9px] font-bold uppercase tracking-widest">{profsDisplay.length}/{profissionais.length}</div>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                {(profissionais || []).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setProfVisiveis({...profVisiveis, [p.id]: !profVisiveis[p.id]})}
                    className={cn(
                      "flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-300 group w-full text-left",
                      profVisiveis[p.id]
                        ? "bg-white dark:bg-white/[0.04] border-[#d48997]/20 dark:border-white/10 shadow-[0_10px_30px_-10px_rgba(212,137,151,0.15)] dark:shadow-none translate-x-0.5"
                        : "bg-transparent border-transparent opacity-40 hover:opacity-85 hover:bg-gray-100/50 dark:hover:bg-white/[0.01]"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs relative overflow-hidden transition-all duration-500 shrink-0",
                      profVisiveis[p.id] ? "bg-[#d48997]/10 text-[#d48997] dark:text-[#f4d1d6]" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                    )}>
                      {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" /> : p.nome?.[0]}
                      {profVisiveis[p.id] && <div className="absolute inset-0 border border-[#d48997]/30 rounded-xl pointer-events-none" />}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className={cn(
                        "text-xs font-semibold tracking-wide truncate transition-colors",
                        profVisiveis[p.id] ? "text-gray-900 dark:text-white" : "text-gray-400"
                      )}>{p.nome}</p>
                      {profVisiveis[p.id] && <p className="text-[8px] text-[#d48997] uppercase tracking-[0.2em] mt-1 font-bold">Visível</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Seção BellaPro */}
        <div className="md:hidden px-3 py-3 border-b border-[#f0d6db] dark:border-white/5 bg-[#fff7f8]/95 dark:bg-[#16141a]/85 backdrop-blur-3xl sticky top-[var(--admin-mobile-header-height,73px)] z-50 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl border border-[#ecd5d9] dark:border-white/5 bg-white dark:bg-white/[0.04] text-[#6f5560] dark:text-white/80 shadow-sm"
              >
                <Menu size={20} />
              </button>
              <h2 className="truncate text-[15px] font-black text-[#20191f] dark:text-white">Agenda</h2>
            </div>

            <div className="flex items-center gap-1">
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-white/[0.04] text-[#8c6b75] dark:text-white/80 border border-[#ecd5d9] dark:border-white/5 shadow-sm">
                <Share2 size={18} />
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('admin:open-notifications'))}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-white/[0.04] text-[#8c6b75] dark:text-white/80 border border-[#ecd5d9] dark:border-white/5 shadow-sm"
              >
                <Bell size={18} />
              </button>
              <button onClick={carregar} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-white/[0.04] text-[#8c6b75] dark:text-white/80 border border-[#ecd5d9] dark:border-white/5 shadow-sm">
                <RefreshCw size={18} />
              </button>
              <div className="relative">
                <select className="appearance-none h-11 rounded-2xl border border-[#ecd5d9] dark:border-white/5 bg-white dark:bg-white/[0.04] pl-4 pr-9 text-sm font-black text-[#20191f] dark:text-white outline-none shadow-sm">
                  <option className="dark:bg-[#16141a]">Dia</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-2xl border border-[#3b3139] dark:border-white/5 bg-[#2c232a] dark:bg-white/[0.04] px-2 py-1.5 shadow-[0_10px_26px_-18px_rgba(32,25,31,0.9)]">
              <button onClick={() => setDataFiltro(addDays(dataFiltro, -1))} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white">
                <ChevronLeft size={18} />
              </button>
              <div className="relative px-2">
                <span className="block min-w-[118px] text-center text-[12px] font-black uppercase tracking-tight text-white">
                  {formatDateBR(dataFiltro)}
                </span>
                <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Selecionar data da agenda" />
              </div>
              <button onClick={() => setDataFiltro(addDays(dataFiltro, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-white">
                <ChevronRight size={18} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300">
                <MoreVertical size={18} />
              </button>
            </div>

            <button onClick={() => setModalNovo(true)} className="shrink-0 rounded-2xl bg-[#E29BA8] px-5 text-sm font-black text-white shadow-[0_10px_22px_rgba(226,155,168,0.45)] transition hover:bg-[#d48997] h-12">
              Agendar
            </button>
          </div>
        </div>

        <div className="hidden md:flex px-4 md:px-6 py-3.5 items-center justify-between gap-3 border-b border-black/[0.03] dark:border-white/[0.03] bg-white/70 dark:bg-[#0c0c0e]/70 backdrop-blur-3xl sticky top-[var(--admin-mobile-header-height,73px)] md:top-0 z-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="hidden md:flex w-12 h-12 items-center justify-center rounded-2xl border bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 hover:text-[#d48997] hover:border-[#E29BA8]/30 hover:bg-[#E29BA8]/5 transition-all shadow-sm group"
            >
              <div className="group-active:scale-95 transition-transform">
                {sidebarOpen ? <ChevronLeft size={20} /> : <Filter size={20} />}
              </div>
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-serif font-normal text-gray-900 dark:text-white tracking-wide">Agenda</h2>
              <p className="text-[#d48997] text-[8px] font-bold uppercase tracking-[0.25em] mt-1 hidden md:block">
                {savingProfessionalOrder ? 'Salvando ordem da equipe...' : 'Arraste os profissionais do topo para reorganizar'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center bg-white/50 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl p-1 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <button onClick={() => setDataFiltro(addDays(dataFiltro, -1))} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#d48997] hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all">
                <ChevronLeft size={16} />
              </button>
              <div className="relative px-2 md:px-4 flex items-center gap-1 md:gap-2">
                <CalendarDays size={14} className="text-[#d48997] hidden md:block" />
                <span className="font-semibold text-xs text-gray-800 dark:text-gray-200 tracking-wider w-[90px] md:w-[120px] text-center">{formatDateBR(dataFiltro)}</span>
                <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Selecionar data da agenda" />
              </div>
              <button onClick={() => setDataFiltro(addDays(dataFiltro, 1))} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#d48997] hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all">
                <ChevronRight size={16} />
              </button>
            </div>

            <button onClick={carregar} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-gray-400 hover:text-[#d48997] transition-all bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm group">
              <RefreshCw size={16} className="group-active:rotate-180 transition-transform duration-500" />
            </button>
            <button onClick={() => setModalNovo(true)} className="bg-gradient-to-r from-[#d48997] to-[#e29ba8] hover:from-[#c97b8a] hover:to-[#d48997] text-white px-5 md:px-7 py-3 h-10 md:h-12 rounded-2xl font-semibold text-xs shadow-lg shadow-[#E29BA8]/20 hover:shadow-xl hover:shadow-[#E29BA8]/35 transition-all uppercase tracking-widest flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 duration-300">
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Reservar</span>
            </button>
          </div>
        </div>

        {/* Se??o BellaPro */}
        <div className="md:hidden flex-1 overflow-hidden bg-[#f7f8fb] dark:bg-[#0b0b0d]">
          {profsDisplay.length > 0 && (
            <>
              <div className="px-3 py-3 overflow-x-auto custom-scrollbar border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#111214]">
                <div className="flex gap-4 min-w-max">
                  {profsDisplay.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 min-w-[132px]">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 shrink-0 border border-gray-200 dark:border-white/10">
                        {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" alt={p.nome} /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-500">{p.nome?.[0]}</div>}
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-gray-900 dark:text-white leading-tight line-clamp-2">{p.nome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="relative flex min-w-max" style={{ width: profsDisplay.length * mobileColWidth + 56 }}>
                  <div className="sticky left-0 top-0 z-20 w-14 bg-white dark:bg-[#111214] border-r border-gray-200 dark:border-white/10">
                    <div className="h-[52px] border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111214]" />
                    {hours.map((h) => (
                      <div key={h} className="relative border-b border-gray-200/70 dark:border-white/5 flex items-start justify-center pt-2" style={{ height: mobileHourHeight }}>
                        <span className="text-[10px] font-medium text-gray-500">{String(h).padStart(2, '0')}:00</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex relative">
                    {profsDisplay.map((p) => (
                      <div key={p.id} className="relative flex-shrink-0 border-r border-black/[0.03] dark:border-white/[0.03]" style={{ width: mobileColWidth, height: hours.length * mobileHourHeight + 52 }}>
                        <div className="sticky top-0 z-20 h-[52px] border-b border-black/[0.03] dark:border-white/[0.03] bg-white dark:bg-[#111214] flex items-center justify-center px-2">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{p.nome}</p>
                        </div>
                        {hours.map((h) => (
                          <div key={h} onClick={(e) => handleGridClick(e, p.id, h)} className="w-full border-b border-dashed border-black/[0.04] dark:border-white/[0.03] relative" style={{ height: mobileHourHeight }}>
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.06)_0,rgba(148,163,184,0.06)_48%,transparent_48%,transparent_100%)] opacity-70" />
                          </div>
                        ))}
                        {bloqueios.filter(b => b.profissionalId === p.id).map((b) => {
                          const { inicioHora: inicioBloqueio, fimHora: fimBloqueio } = getBloqueioRenderWindow(b);
                          const [bh, bm] = inicioBloqueio.split(':').map(Number);
                          const [fh, fm] = fimBloqueio.split(':').map(Number);
                          const duracao = Math.max(((fh * 60 + fm) - (bh * 60 + bm)), 30);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={(event) => handleDesbloquearBloqueio(b, event)}
                              title="Clique para desfazer este bloqueio"
                              style={{ top: ((bh - START_HOUR) * mobileHourHeight) + ((bm / 60) * mobileHourHeight) + 52, height: Math.max((duracao / 60) * mobileHourHeight, 30) }}
                              className="absolute left-1 right-1 z-10 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100/80 px-2 text-center transition hover:border-red-300 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/10"
                            >
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{b.motivo || 'Bloqueio'}</span>
                              <span className="mt-1 text-[7px] font-black uppercase tracking-widest text-red-400">Desfazer</span>
                            </button>
                          );
                        })}
                        {agendamentos.filter(a => a.profissionalId === p.id && a.status !== 'cancelado').map((a) => {
                          const duracaoTotal = calculateAgendamentoDuration(a);
                          const mobileLayout = getMobileAppointmentLayout(a.inicioHora, duracaoTotal, mobileHourHeight);
                          const isOnline = isAgendamentoOnline(a);
                          const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.confirmado;
                          return (
                            <motion.div
                              key={`grid-${a.id}`}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={(e) => { e.stopPropagation(); setAgendamentoSelecionado(a); setModalDetalhes(true); }}
                              style={{ top: mobileLayout.top, height: mobileLayout.height, width: `calc(${mobileColWidth}px - 8px)` }}
                              className={cn(
                                "absolute left-1 rounded-[14px] border pl-3.5 pr-2 py-2 overflow-hidden z-20 cursor-pointer shadow-sm",
                                config.bg,
                                config.border,
                                isOnline && 'border-teal-500/20 dark:border-teal-400/20 shadow-[0_6px_12px_rgba(20,184,166,0.1)]'
                              )}
                            >
                              <div className={cn("absolute left-0 top-0 bottom-0 w-[3.5px]", config.accent)} />
                              <div className="flex h-full flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={cn("leading-none font-semibold text-[9px]", config.text)}>
                                      {a.inicioHora}
                                    </p>
                                    {isOnline && !mobileLayout.compact && (
                                      <span className="rounded-full bg-[#14b8a6]/10 text-[#14b8a6] border border-[#14b8a6]/25 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest leading-none">
                                        Online
                                      </span>
                                    )}
                                  </div>
                                  <p className={cn("mt-1 font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate normal-case tracking-wide", mobileLayout.compact ? "text-[9px]" : "text-xs")}>
                                    {a.clienteNome}
                                  </p>
                                  {!mobileLayout.compact && (
                                    <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 truncate normal-case tracking-wide leading-none">{getAgendamentoTitulo(a)}</p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="hidden">
          {agendamentos.filter(a => a.status !== 'cancelado').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <CalendarIcon size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum atendimento hoje</p>
              <button onClick={() => setModalNovo(true)} className="mt-6 bg-[#d48997] text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-[#E29BA8]/20">
                <Plus size={14} /> Novo Agendamento
              </button>
            </div>
          ) : (
            [...agendamentos]
              .filter(a => a.status !== 'cancelado')
              .sort((a, b) => a.inicioHora.localeCompare(b.inicioHora))
              .map(a => {
                const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.confirmado;
                const StatusIcon = config.icon;
                const total = calculateAgendamentoTotal(a);
                const isPago = a.statusPagamento === 'pago';
                const isOnline = isAgendamentoOnline(a);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => { setAgendamentoSelecionado(a); setModalDetalhes(true); }}
                    className={cn(
                      `rounded-[1.5rem] border p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all ${config.bg} ${config.border}`,
                      isOnline && 'ring-1 ring-[#14b8a6]/40 shadow-[0_22px_44px_-34px_rgba(20,184,166,0.6)]'
                    )}
                  >
                    {/* Se??o BellaPro */}
                    <div className="w-14 h-14 rounded-2xl bg-white/60 dark:bg-black/20 flex flex-col items-center justify-center flex-shrink-0 border border-white/40">
                      <span className={`text-base font-black leading-none ${config.text}`}>{a.inicioHora}</span>
                      <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-0.5">hora</span>
                    </div>
                    {/* Se??o BellaPro */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black uppercase tracking-tight truncate ${config.text} dark:text-white`}>{a.clienteNome}</p>
                      <p className="text-[10px] font-bold text-gray-500 truncate mt-0.5">{getAgendamentoTitulo(a)} • {a.profissional?.nome}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${config.bg} ${config.text} border ${config.border}`}>
                          <StatusIcon size={8} className="inline mr-1" />{config.label || a.status}
                        </span>
                        {isOnline && (
                          <span className="rounded-lg border border-[#14b8a6]/25 bg-[#14b8a6]/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#0f9a8c]">
                            Online
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isPago ? 'text-[#E29BA8]' : 'text-bellapro-blush'}`}>
                          {isPago ? 'Pago' : `R$ ${total.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </motion.div>
                );
              })
          )}
          </div>
        </div>

        {/* Se??o BellaPro */}
        <div ref={gridRef} className="hidden md:block flex-1 overflow-auto relative custom-scrollbar z-10 scroll-smooth">
          {/* Se??o BellaPro */}
          <div className="sticky top-0 z-40 flex bg-white/70 dark:bg-[#0c0c0e]/75 backdrop-blur-3xl border-b border-black/[0.03] dark:border-white/[0.03]" style={{ marginLeft: 60 }}>
            {profsDisplay.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={handleProfessionalDragStart(p.id)}
                onDragOver={handleProfessionalDragOver(p.id)}
                onDrop={handleProfessionalDrop(p.id)}
                onDragEnd={handleProfessionalDragEnd}
                className={cn(
                  "py-4 px-3 flex flex-col items-center justify-center border-r border-black/[0.02] dark:border-white/[0.02] flex-shrink-0 relative group cursor-grab active:cursor-grabbing hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-300",
                  dragOverProfId === p.id && draggedProfId !== p.id && "bg-[#d48997]/10 dark:bg-[#d48997]/15",
                  draggedProfId === p.id && "opacity-50"
                )}
                style={{ width: colWidth }}
              >
                <div className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/60 dark:bg-white/5 text-[#d48997] dark:text-[#f1bcc4] opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105 active:scale-95 shadow-sm">
                  <MoreVertical size={12} />
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.03] relative z-10 shadow-sm border-2 border-white dark:border-[#131118] group-hover:border-[#d48997] group-hover:shadow-md transition-all duration-500">
                  {p.fotoUrl ? (
                    <img src={p.fotoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-lg uppercase bg-gradient-to-tr from-gray-50 to-gray-200 dark:from-white/5 dark:to-white/10">
                      {p.nome[0]}
                    </div>
                  )}
                </div>
                <div className="text-center mt-2.5 overflow-hidden w-full relative z-10">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 tracking-wide truncate px-2 group-hover:text-[#d48997] transition-colors">{p.nome}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex" style={{ width: profsDisplay.length * colWidth + 60 }}>
            <div className="sticky left-0 w-[60px] bg-white/70 dark:bg-[#0c0c0e]/75 backdrop-blur-2xl border-r border-black/[0.03] dark:border-white/[0.03] z-30 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.02)] dark:shadow-none">
              {hours.map(h => (
                <div key={h} className="relative border-b border-dashed border-black/[0.03] dark:border-white/[0.03] flex items-center justify-center" style={{ height: hourHeight }}>
                  <span className="text-[10px] font-light text-gray-400 dark:text-gray-500 tracking-wider relative -top-1/2">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            <div className="flex relative">
              {profsDisplay.map(p => (
                <div key={p.id} className="relative border-r border-black/[0.03] dark:border-white/[0.03] last:border-r-0 flex-shrink-0" style={{ width: colWidth, height: hours.length * hourHeight }}>
                  {hours.map(h => (
                    <div 
                      key={h} 
                      onClick={(e) => handleGridClick(e, p.id, h)}
                      className="w-full border-b border-dashed border-black/[0.04] dark:border-white/[0.03] group relative cursor-pointer hover:bg-[#d48997]/[0.02] dark:hover:bg-[#E29BA8]/[0.05] transition-all" 
                      style={{ height: hourHeight }}
                    >
                       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none scale-90 group-hover:scale-100 duration-300">
                          <div className="px-4 py-2 rounded-xl bg-[#d48997] text-white font-semibold text-[9px] uppercase tracking-widest shadow-lg shadow-[#E29BA8]/30 flex items-center gap-2">
                            <Plus size={12} /> Reservar
                          </div>
                       </div>
                    </div>
                  ))}

                  {bloqueios.filter(b => b.profissionalId === p.id).map(b => {
                    const { inicioHora: inicioBloqueio, fimHora: fimBloqueio } = getBloqueioRenderWindow(b);
                    const [bh, bm] = inicioBloqueio.split(':').map(Number);
                    const [fh, fm] = fimBloqueio.split(':').map(Number);
                    const duracao = Math.max(((fh * 60 + fm) - (bh * 60 + bm)), 30);
                    const pos = getPosition(inicioBloqueio, duracao);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={(event) => handleDesbloquearBloqueio(b, event)}
                        title="Clique para desfazer este bloqueio"
                        style={{ top: pos.top, height: pos.height }}
                        className="group absolute left-0.5 right-0.5 z-10 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1rem] border border-dashed border-gray-200 bg-gray-100/40 px-2 text-center transition hover:border-red-300 hover:bg-red-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-red-500/10"
                      >
                         <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 opacity-70 dark:text-gray-500">{b.motivo || 'Bloqueado'}</span>
                         <span className="mt-1 text-[7px] font-black uppercase tracking-widest text-red-400 opacity-0 transition group-hover:opacity-100">Desfazer</span>
                      </button>
                    );
                  })}

                  <AnimatePresence>
                    {agendamentos.filter(a => a.profissionalId === p.id && a.status !== 'cancelado').map(a => {
                      const duracaoTotal = calculateAgendamentoDuration(a);
                      const pos = getPosition(a.inicioHora, duracaoTotal);
                      const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.confirmado;
                      const StatusIcon = config.icon;
                      const isOnline = isAgendamentoOnline(a);
                      
                      return (
                        <motion.div 
                          key={a.id} 
                          layoutId={a.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={(e) => { e.stopPropagation(); setAgendamentoSelecionado(a); setModalDetalhes(true); }}
                          style={{ 
                            top: pos.top + 1, 
                            height: pos.height - 2,
                            // Se??o visual BellaPro
                            zIndex: 20,
                            width: `calc(${colWidth}px - 12px)`,
                          }} 
                          className={cn(
                            `absolute left-1.5 rounded-[1.25rem] border shadow-sm ${config.bg} ${config.border} pl-4 pr-3 py-3 cursor-pointer overflow-hidden group hover:z-50 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300`,
                            isOnline ? 'border-teal-500/20 dark:border-teal-400/20 shadow-[0_10px_20px_-10px_rgba(20,184,166,0.15)]' : 'shadow-black/[0.02]'
                          )}
                        >
                          <div className={cn("absolute left-0 top-0 bottom-0 w-[4.5px]", config.accent)} />
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("text-[10px] font-semibold tracking-wider", config.text)}>{a.inicioHora}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isOnline && (
                                <span className="rounded-full bg-[#14b8a6]/10 text-[#14b8a6] border border-[#14b8a6]/20 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest">
                                  Online
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate normal-case tracking-wide leading-tight mb-0.5">{a.clienteNome}</p>
                          <p className="text-[10px] font-normal text-gray-500 dark:text-gray-400 truncate normal-case tracking-wide leading-none">{getAgendamentoTitulo(a)}</p>

                          {pos.height > 60 && (
                            <div className="absolute bottom-2.5 left-4 right-3 pt-1.5 border-t border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between opacity-70">
                               <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                 <Clock size={8} /> {formatDurationLabel(duracaoTotal)}
                               </p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {dataFiltro === formatDateInput() && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-[#E29BA8] z-30 pointer-events-none flex items-center shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                style={{ top: (currentTime.getHours() - START_HOUR) * hourHeight + (currentTime.getMinutes() / 60) * hourHeight, width: profsDisplay.length * colWidth + 60 }}
              >
                <div className="w-3 h-3 bg-[#E29BA8] rounded-full -ml-1.5 border-[3px] border-white dark:border-[#0c0c0e] shadow-[0_0_15px_rgba(168,85,247,1)] relative">
                   <div className="absolute inset-0 bg-[#E29BA8] rounded-full animate-ping opacity-50" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Se??o BellaPro */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[150]" onClick={() => setContextMenu(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{ left: contextMenu.x, top: contextMenu.y }}
              className="fixed z-[160] bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 min-w-[180px] backdrop-blur-xl"
            >
              <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{contextMenu.hora} - Opcoes</p>
              </div>
              <button 
                onClick={() => {
                  setPreFill({ hora: contextMenu.hora, profId: contextMenu.profId });
                  setModalNovo(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-6 py-3 hover:bg-[#d48997] hover:text-white transition-all flex items-center gap-3 text-[9px] font-black uppercase tracking-widest"
              >
                <Plus size={14} /> Novo Agendamento
              </button>
              <button 
                onClick={handleBloquear}
                className="w-full text-left px-6 py-3 hover:bg-bellapro-blush hover:text-white transition-all flex items-center gap-3 text-[9px] font-black uppercase tracking-widest"
              >
                <X size={14} /> Bloquear Horario
              </button>
              <button
                onClick={() => {
                  setModalBloqueioPeriodo({
                    profId: contextMenu.profId,
                    hora: contextMenu.hora,
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-6 py-3 hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center gap-3 text-[9px] font-black uppercase tracking-widest"
              >
                <Clock size={14} /> Bloquear Periodo
              </button>
              <button
                onClick={handleBloquearDiaTodo}
                className="w-full text-left px-6 py-3 hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center gap-3 text-[9px] font-black uppercase tracking-widest"
              >
                <CalendarDays size={14} /> Bloquear Dia Inteiro
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
        .modal-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.32) transparent; }
        .modal-scrollbar::-webkit-scrollbar { width: 8px; }
        .modal-scrollbar::-webkit-scrollbar-track { background: transparent; margin: 18px 0; }
        .modal-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(168,85,247,0.42), rgba(99,102,241,0.24));
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(168,85,247,0.58), rgba(99,102,241,0.38));
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .dark .modal-scrollbar { scrollbar-color: rgba(255,255,255,0.16) transparent; }
        .dark .modal-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08));
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .dark .modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.14));
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; opacity: 0; position: absolute; left: 0; right: 0; top: 0; bottom: 0; width: 100%; height: 100%; }
        .dark input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>
    </motion.div>
  );
}
