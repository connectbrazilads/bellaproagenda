import React, { useEffect, useState, useMemo } from 'react';
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
  criarAgendamentoAdmin, updateStatusAgendamento, deleteAgendamento, 
  buscarClientes, addItemAgendamento, removeItemAgendamento, addProdutoAgendamento, removeProdutoAgendamento, updatePagamentoAgendamento,
  createBloqueio, getListaEspera, createListaEspera, deleteListaEspera, reagendarAgendamento
} from '../../services/api';
import { addDays, cn, formatDateBR, formatDateInput, formatDurationLabel } from '../../lib/utils';

const START_HOUR = 7;
const END_HOUR = 22;

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    bg: 'bg-amber-50/90 dark:bg-bellapro-blush/10 backdrop-blur-xl',
    border: 'border-amber-200 dark:border-bellapro-blush/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-bellapro-blush shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    icon: Clock3
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-white/90 dark:bg-[#d48997]/10 backdrop-blur-xl',
    border: 'border-[#E29BA8]/20 dark:border-[#E29BA8]/30',
    text: 'text-[#b96a79] dark:text-[#f4d1d6]',
    dot: 'bg-[#E29BA8] shadow-[0_0_10px_rgba(168,85,247,0.5)]',
    icon: CalendarDays
  },
  em_atendimento: {
    label: 'Em Agenda',
    bg: 'bg-blue-50/90 dark:bg-[#E29BA8]/10 backdrop-blur-xl',
    border: 'border-blue-200 dark:border-[#E29BA8]/30',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-[#E29BA8] shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    icon: Zap
  },
  concluido: {
    label: 'Conclu?do',
    bg: 'bg-[#E29BA8]/5/90 dark:bg-[#E29BA8]/10 backdrop-blur-xl',
    border: 'border-[#E29BA8]/20 dark:border-[#E29BA8]/30',
    text: 'text-emerald-700 dark:text-[#efbac2]',
    dot: 'bg-[#E29BA8] shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    icon: CheckCircle2
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-rose-50/90 dark:bg-red-500/10 backdrop-blur-xl',
    border: 'border-rose-200 dark:border-red-500/30',
    text: 'text-rose-700 dark:text-red-400',
    dot: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    icon: AlertCircle
  },
};

function normalizePhone(value = '') {
  return value.replace(/\D/g, '');
}

function calculateAgendamentoTotal(agendamento) {
  let total = Number(agendamento?.servico?.preco || agendamento?.pacote?.preco || 0);
  total += agendamento?.itens?.reduce((acc, item) => acc + Number(item.preco || 0), 0) || 0;
  total += agendamento?.produtos?.reduce((acc, produto) => acc + (Number(produto.preco || 0) * Number(produto.quantidade || 0)), 0) || 0;
  return total;
}

function getAgendamentoTitulo(agendamento) {
  return agendamento?.servico?.nome
    || agendamento?.pacote?.nome
    || agendamento?.itens?.map((item) => item.nome || item.servico?.nome).filter(Boolean).join(' + ')
    || 'Servico';
}

// Se??o visual BellaPro

function ModalNovoAgendamento({ onClose, onSave, preData, preHora, preProf, prefillData }) {
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
    encaixe: false
  });
  const [servicos, setServicos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [isPacote, setIsPacote] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [agendamentosCliente, setAgendamentosCliente] = useState([]);
  const [loadingDuplicidade, setLoadingDuplicidade] = useState(false);
  const [abaResumo, setAbaResumo] = useState('dados');

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
    getServicos().then(r => setServicos(r?.data || []));
    getPacotes().then(r => setPacotes(r?.data || []));
    getProfissionais().then(r => setProfissionais((r?.data || []).filter(p => p.ativo)));
  }, []);

  const servicoIdsDoProfissionalSelecionado = useMemo(() => {
    const profissional = profissionais.find((p) => p.id === form.profissionalId);
    return new Set((profissional?.servicos || []).map((item) => item.servicoId));
  }, [profissionais, form.profissionalId]);

  const servicoIdsDoPacoteSelecionado = useMemo(() => {
    const pacote = pacotes.find((item) => item.id === form.pacoteId);
    return (pacote?.servicos || []).map((item) => item.servicoId);
  }, [pacotes, form.pacoteId]);

  const profissionaisCompativeis = useMemo(() => {
    const servicosNecessarios = form.pacoteId ? servicoIdsDoPacoteSelecionado : form.servicoIds;
    if (servicosNecessarios.length === 0) return profissionais;

    return profissionais.filter((profissional) => {
      const servicosDoProfissional = new Set((profissional.servicos || []).map((item) => item.servicoId));
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

  useEffect(() => {
    if (!form.profissionalId) return;

    const profissionalAindaCompativel = profissionaisCompativeis.some((profissional) => profissional.id === form.profissionalId);
    if (!profissionalAindaCompativel) {
      setForm((prev) => ({ ...prev, profissionalId: '' }));
    }
  }, [form.profissionalId, profissionaisCompativeis]);

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
    if (val.length < 2) { setSugestoes([]); return; }
    try {
      const res = await buscarClientes(val);
      setSugestoes(res?.data || []);
      setShowSug(true);
    } catch (e) { console.error(e); }
  }

  function selecionar(c) {
    setForm(f => ({ ...f, clienteNome: c.nome, clienteTelefone: c.telefone }));
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
          const mesmoTelefone = telefone && normalizePhone(ag.clienteTelefone) === telefone;
          const mesmoNome = !telefone && nome && ag.clienteNome?.trim().toLowerCase() === nome;
          return ag.status !== 'cancelado' && (mesmoTelefone || mesmoNome);
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
  }, [form.clienteNome, form.clienteTelefone, form.data]);

  function toggleServico(id) {
    if (form.profissionalId && !servicoIdsDoProfissionalSelecionado.has(id)) return;

    setForm(f => ({
      ...f,
      servicoIds: f.servicoIds.includes(id) 
        ? f.servicoIds.filter(x => x !== id) 
        : [...f.servicoIds, id],
      pacoteId: ''
    }));
  }

  async function salvar() {
    if (!form.clienteNome || !form.clienteTelefone || !form.profissionalId || (form.servicoIds.length === 0 && !form.pacoteId) || !form.hora) {
      alert('Preencha todos os campos obrigatÒ³rios');
      return;
    }
    try {
      await criarAgendamentoAdmin(form);
      onSave();
    } catch (e) { alert(e.response?.data?.error || 'Erro ao criar'); }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 40, opacity: 0 }}
        className="bg-white dark:bg-[#0c0c0e] rounded-t-[2rem] md:rounded-[3rem] w-full max-w-2xl h-[95dvh] md:h-auto md:max-h-[92dvh] overflow-y-auto modal-scrollbar p-4 sm:p-6 md:p-10 md:pr-6 xl:p-14 xl:pr-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] relative border border-gray-200 dark:border-white/5"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#d48997] via-fuchsia-500 to-indigo-600" />
        
        <button 
          onClick={onClose} 
          className="absolute top-4 sm:p-6 right-6 md:top-5 md:p-10 md:right-10 w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-red-500 transition-all hover:rotate-90 hover:scale-110 active:scale-95"
        >
          <X size={24} />
        </button>
        
        <div className="mb-8 md:mb-12 pr-14 md:pr-16">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-[#d48997] rounded-2xl shadow-xl shadow-[#E29BA8]/20">
              <CalendarIcon size={24} className="text-gray-900 dark:text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl xl:text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-none">Nova Reserva</h2>
              <p className="text-[#E29BA8] text-[10px] font-black uppercase tracking-[0.3em] mt-1">BellaPro Agenda</p>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAbaResumo('dados')}
                className={cn(
                  'flex-1 rounded-[2rem] px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                  abaResumo === 'dados' ? 'bg-white dark:bg-[#d48997] text-[#d48997] dark:text-white shadow-xl' : 'text-gray-400'
                )}
              >
                Dados da Reserva
              </button>
              <button
                type="button"
                onClick={() => setAbaResumo('conflitos')}
                className={cn(
                  'flex-1 rounded-[2rem] px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                  abaResumo === 'conflitos' ? 'bg-white dark:bg-bellapro-blush/90 text-bellapro-blush dark:text-white shadow-xl' : 'text-gray-400',
                  agendamentosCliente.length > 0 && 'text-bellapro-blush dark:text-amber-300'
                )}
              >
                Outro Agendamento
              </button>
            </div>
          </div>

          {abaResumo === 'conflitos' && (
            <div className="rounded-[2rem] border border-amber-200 dark:border-bellapro-blush/20 bg-amber-50/80 dark:bg-bellapro-blush/10 p-4 sm:p-6 md:p-8 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-bellapro-blush">Cliente j?Ò¡ possui agenda nao dia</p>
                  <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                    {loadingDuplicidade ? 'Verificando agendamentos...' : `${agendamentosCliente.length} horario(s) encontrado(s) em ${formatDateBR(form.data)}`}
                  </h3>
                </div>
                {agendamentosCliente.length > 0 && (
                  <span className="rounded-full bg-bellapro-blush text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    Agenda
                  </span>
                )}
              </div>

              {agendamentosCliente.length > 0 ? (
                <div className="space-y-3">
                  {agendamentosCliente.map((ag) => (
                    <div key={ag.id} className="rounded-[1.75rem] bg-white dark:bg-black/20 border border-amber-100 dark:border-white/5 px-5 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{ag.profissional?.nome}</p>
                        <p className="text-[10px] font-black text-bellapro-blush uppercase tracking-[0.2em] mt-1">
                          {ag.inicioHora} â��¢ {getAgendamentoTitulo(ag)}
                        </p>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        {formatDurationLabel((ag.servico?.duracaoMin ?? ag.pacote?.duracaoMin ?? 0) + (ag.itens?.reduce((sum, item) => sum + Number(item.duracaoMin || 0), 0) || 0))}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:p-8">
            <div className="space-y-3 relative">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6 flex items-center gap-2">
                <Phone size={10} className="text-[#d48997]" /> WhatsApp / Telefone
              </label>
              <input 
                value={form.clienteTelefone} 
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  setForm({...form, clienteTelefone: v});
                  buscar(v);
                }} 
                placeholder="(00) 00000-0000"
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] px-8 py-5 outline-none text-gray-900 dark:text-white focus:ring-4 ring-[#E29BA8]/10 transition-all font-black text-sm" 
              />
            </div>
            <div className="space-y-3 relative">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6 flex items-center gap-2">
                <User size={10} className="text-[#d48997]" /> Nome Completo
              </label>
              <input 
                value={form.clienteNome} 
                onChange={e => {
                  setForm({...form, clienteNome: e.target.value});
                  buscar(e.target.value);
                }} 
                placeholder="IdentificaÒ§Ò£o do cliente..."
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] px-8 py-5 outline-none text-gray-900 dark:text-white focus:ring-4 ring-[#E29BA8]/10 transition-all font-black text-sm" 
              />
              
              <AnimatePresence>
                {showSug && sugestoes.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/10 rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-[210] overflow-hidden backdrop-blur-3xl"
                  >
                    {sugestoes.map((s) => (
                      <button 
                        key={s.id} 
                        onClick={() => selecionar(s)}
                        className="w-full text-left px-8 py-5 hover:bg-[#d48997] transition-all flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase group-hover:text-gray-900 dark:text-white transition-colors tracking-tight">{s.nome}</p>
                          <p className="text-[10px] text-gray-400 group-hover:text-gray-600 dark:text-white/60 font-bold tracking-[0.2em]">{s.telefone}</p>
                        </div>
                        <Check size={16} className="text-[#E29BA8] group-hover:text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex p-2 bg-gray-100 dark:bg-white/5 rounded-[2rem] border border-gray-200 dark:border-white/5">
             <button 
               onClick={() => setIsPacote(false)} 
               className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${!isPacote ? 'bg-white dark:bg-[#d48997] shadow-xl text-[#d48997] dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
             >
               Servicos Individuais
             </button>
             <button 
               onClick={() => setIsPacote(true)} 
               className={`flex-1 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${isPacote ? 'bg-white dark:bg-[#d48997] shadow-xl text-[#d48997] dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
             >
               Pacotes Combo
             </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:p-8">
            {isPacote ? (
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6">Cat?logo de Pacotes</label>
                <select 
                  value={form.pacoteId} 
                  onChange={e => setForm({...form, pacoteId: e.target.value, servicoIds: []})} 
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-[2rem] px-8 py-5 outline-none text-gray-900 dark:text-white font-black text-sm appearance-none cursor-pointer"
                >
                  <option value="" className="dark:bg-gray-900">Escolha o combo...</option>
                  {pacotes.map((p) => <option key={p.id} value={p.id} className="dark:bg-gray-900">{p.nome} · R$ {p.preco}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6">Sele??o Multi-Servico</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 p-4 md:p-6 bg-gray-100 dark:bg-white/5 rounded-[2rem] md:rounded-[2rem] border border-gray-200 dark:border-white/5 max-h-56 overflow-y-auto custom-scrollbar shadow-inner">
                  {servicosDisponiveis.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleServico(s.id)}
                      className={`text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-tight border-2 transition-all duration-500 relative group overflow-hidden ${
                        form.servicoIds.includes(s.id) 
                        ? 'bg-[#d48997] border-[#d48997] text-white shadow-lg shadow-[#E29BA8]/30' 
                        : 'bg-white dark:bg-[#1a1a1c] border-gray-200 dark:border-white/5 text-gray-600 hover:border-[#E29BA8]/40'
                      }`}
                    >
                      {s.nome}
                      {form.servicoIds.includes(s.id) && <Check size={10} className="absolute top-2 right-2" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6">Artista Respons?vel</label>
              <select 
                value={form.profissionalId} 
                onChange={e => setForm({...form, profissionalId: e.target.value})} 
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] px-8 py-5 outline-none text-gray-900 dark:text-white font-black text-sm appearance-none cursor-pointer"
              >
                <option value="" className="dark:bg-gray-900">Selecione o profissional...</option>
                {profissionaisCompativeis.map(p => <option key={p.id} value={p.id} className="dark:bg-gray-900">{p.nome}</option>)}
              </select>
              {(form.servicoIds.length > 0 || form.pacoteId) && profissionaisCompativeis.length === 0 && (
                <p className="text-xs font-bold text-bellapro-blush ml-6">
                  Nenhum profissional atende essa combinaÒ§Ò£o de servicos.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:p-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6">Data</label>
              <div className="relative w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] pl-16 pr-8 py-5">
                <CalendarIcon size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-[#E29BA8]" />
                <span className="block font-black text-sm text-gray-900 dark:text-white tracking-[0.15em]">
                  {formatDateBR(form.data)}
                </span>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm({...form, data: e.target.value})}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Selecionar data"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6">Horário</label>
              <div className="relative">
                <Clock size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-[#E29BA8]" />
                <select 
                  value={form.hora} 
                  onChange={e => setForm({...form, hora: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] pl-16 pr-8 py-5 outline-none text-gray-900 dark:text-white font-black text-sm appearance-none cursor-pointer"
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
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:p-8">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-4 sm:p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <input 
                type="checkbox" 
                id="recorrente"
                checked={form.recorrente}
                onChange={e => setForm({...form, recorrente: e.target.checked})}
                className="w-6 h-6 rounded-lg accent-[#d48997] cursor-pointer"
              />
              <label htmlFor="recorrente" className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 cursor-pointer">Repetir Semanalmente</label>
            </div>
            
            {form.recorrente && (
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 ml-6">N?mero de Semanas</label>
                <select 
                  value={form.semanas}
                  onChange={e => setForm({...form, semanas: Number(e.target.value)})}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] px-8 py-5 outline-none text-gray-900 dark:text-white font-black text-sm"
                >
                  <option value={4}>4 Semanas (1 mes)</option>
                  <option value={8}>8 Semanas (2 mes)</option>
                  <option value={12}>12 Semanas (3 mes)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-4 sm:p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 mb-8">
            <input 
              type="checkbox" 
              id="encaixe"
              checked={form.encaixe}
              onChange={e => setForm({...form, encaixe: e.target.checked})}
              className="w-6 h-6 rounded-lg accent-[#d48997] cursor-pointer"
            />
            <label htmlFor="encaixe" className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 cursor-pointer">ForÒ§ar Encaixe (Permitir SobreposiÒ§Ò£o)</label>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={salvar} 
            className="w-full py-8 bg-[#0a0a0a] dark:bg-white text-white dark:text-gray-950 rounded-[2rem] font-black text-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] transition-all uppercase tracking-[0.3em] flex items-center justify-center gap-4 group"
          >
            Confirmar Reserva <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModalDetalhesAgendamento({ agendamento: initialAgendamento, onClose, onUpdate, onReagendar }) {
  const [agendamento, setAgendamento] = useState(initialAgendamento);
  const [servicos, setServicos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [concluidoSucesso, setConcluidoSucesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('comanda');
  const [pagamentoForma, setPagamentoForma] = useState('');
  const [pagamentoTaxa, setPagamentoTaxa] = useState('0');

  useEffect(() => {
    getServicos().then(r => setServicos(r?.data || []));
    getProdutos().then(r => setProdutos(r?.data || []));
  }, []);

  useEffect(() => {
    setAgendamento(initialAgendamento);
  }, [initialAgendamento]);

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

  async function handleCheckout(forma) {
    setLoading(true);
    try {
      const total = calculateTotal();
      const res = await updatePagamentoAgendamento(agendamento.id, { 
        pagamentos: [{ forma, valor: total }],
        taxaOperadora: Number(pagamentoTaxa) || 0
      });
      if (res?.data) {
        setAgendamento(res.data);
        onUpdate(res.data);
      }
      setConcluidoSucesso(true);
    } catch (e) {
      alert('Erro ao processar checkout');
    } finally {
      setLoading(false);
    }
  }

  const calculateTotal = () => {
    return calculateAgendamentoTotal(agendamento);
  };

  if (!agendamento) return null;

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
                   <span className="text-[10px] font-black text-[#E29BA8] uppercase tracking-[0.3em]">Gestão de Agenda BellaPro</span>
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
              <div className={cn("px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border", agendamento.statusPagamento === 'pago' ? 'bg-[#E29BA8]/10 text-[#E29BA8] border-[#E29BA8]/20' : 'bg-bellapro-blush/10 text-bellapro-blush border-bellapro-blush/20')}>
                {agendamento.statusPagamento === 'pago' ? 'PAGAMENTO OK' : 'PENDENTE'}
              </div>
           </div>
           <div className="flex items-center gap-2">
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
                  onClick={() => onReagendar?.(agendamento)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-gray-900 dark:text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg"
                >
                  Reagendar
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
                   <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">PreÒ§o UnitÒ¡rio</span>
                      <span className="font-black text-gray-900 dark:text-white">{Number(agendamento.servico?.preco || agendamento.pacote?.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                   </div>
                </div>

                {agendamento?.itens?.length > 0 && (
                  <div className="space-y-4">
                    {agendamento.itens.map(item => (
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
                  <Plus size={14} /> Adicionar Itens
                </button>
                {agendamento.statusPagamento === 'pago' ? (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 bg-[#E29BA8]/10 text-[#d48997] border border-[#E29BA8]/20">
                      <CheckCircle2 size={14} /> Pagamento Confirmado
                    </div>
                    <button 
                      onClick={() => {
                        const total = (Number(agendamento.servico?.preco || agendamento.pacote?.preco || 0) + (agendamento.itens?.reduce((s,i) => s + i.preco, 0) || 0) + (agendamento.produtos?.reduce((s,p) => s + (p.preco * p.quantidade), 0) || 0));
                        const itensArr = [
                          agendamento.servico?.nome || agendamento.pacote?.nome,
                          ...(agendamento.itens?.map(i => i.servico?.nome) || []),
                          ...(agendamento.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                        ].filter(Boolean);
                        const itensStr = itensArr.join(', ');
                        
                        const msg = encodeURIComponent(
                          `*REENVIO DE COMPROVANTE*\n\n` +
                          `Ol?, *${agendamento.clienteNome}*!\n` +
                          `Segue o seu comprovante de atendimento.\n\n` +
                          `*Detalhes:*\n${itensStr}\n` +
                          `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                          `Agradecemos a prefer?ncia! â�¨`
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
                    onClick={() => setTab('pagamento')} 
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
                   <section>
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E29BA8]" /> Servicos Adicionais
                        </h4>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{(servicos || []).length} DISPONÒVEIS</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                         {(servicos || []).filter((s) => s.id !== agendamento.servicoId).map((s) => (
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
                   </section>

                   <section>
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E29BA8]" /> Produtos & Bar
                        </h4>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{(produtos || []).length} PRODUTOS</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                         {(produtos || []).map(p => (
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
                        <p className="text-gray-500 text-lg mb-12 max-w-sm font-medium">O atendimento foi concluÒ­do e os valores foram integrados ao seu financeiro BellaPro.</p>
                        
                        <div className="w-full max-w-md space-y-4">
                          <button 
                            onClick={() => {
                              const total = calculateTotal();
                              const itens = [
                                agendamento.servico?.nome || agendamento.pacote?.nome,
                                ...(agendamento.itens?.map(i => i.servico?.nome) || []),
                                ...(agendamento.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                              ].filter(Boolean).join(', ');
                              
                              const msg = encodeURIComponent(
                                `*COMPROVANTE DE ATENDIMENTO*\n\n` +
                                `Ol?, *${agendamento.clienteNome}*!\n` +
                                `Seu atendimento foi finalizado com sucesso.\n\n` +
                                `*Detalhes:*\n${itens}\n` +
                                `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                                `Agradecemos a prefer?ncia! â�¨`
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
                             <p className="text-gray-500 text-sm font-medium mt-3">Finalize a experiÒªncia do cliente e lance os valores nao fluxo financeiro BellaPro.</p>
                           </div>
                        </div>

                        <div className="max-w-2xl mx-auto space-y-6">
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
                                     <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em] mt-1', pagamentoForma === item.forma ? 'text-gray-600 dark:text-white/70' : 'text-gray-400')}>Cobran?a rÒ¡pida</p>
                                   </div>
                                 </div>
                               </button>
                             ))}
                           </div>

                           <div className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4 sm:p-6 space-y-4">
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
                               disabled={!pagamentoForma || loading || agendamento.statusPagamento === 'pago'}
                               className="w-full rounded-[2rem] bg-[#E29BA8] hover:bg-[#d48997] disabled:opacity-40 disabled:cursor-not-allowed text-white py-6 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#E29BA8]/20 transition-all flex items-center justify-center gap-3 mt-4"
                             >
                               <CheckCircle2 size={18} /> {agendamento.statusPagamento === 'pago' ? 'JÒ¡ pago' : 'Finalizar cobranÒ§a'}
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
}

export default function Agenda() {
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
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
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

  const [colWidth, setColWidth] = useState(180);
  const [hourHeight, setHourHeight] = useState(80);
  const [profVisiveis, setProfVisiveis] = useState({});
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
  const mobileColWidth = 142;
  const mobileHourHeight = 92;

  const handleGridClick = (e, profId, hour) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      profId,
      hora: `${String(hour).padStart(2, '0')}:00`
    });
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
        fimHora: `${String(Number(contextMenu.hora.split(':')[0]) + 1).padStart(2, '0')}:00`,
        motivo
      });
      carregar();
    } catch (e) { alert('Erro ao bloquear'); }
    setContextMenu(null);
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
    } catch (e) { alert(e.response?.data?.error || 'Erro ao bloquear o dia inteiro'); }
    setContextMenu(null);
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
        observacao: 'Entrada rÒ¡pida pela agenda',
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
        {modalDetalhes && agendamentoSelecionado && (
          <ModalDetalhesAgendamento 
            agendamento={agendamentoSelecionado} 
            onUpdate={(updatedAgendamento) => {
              if (updatedAgendamento?.id) {
                setAgendamentos((prev) => prev.map((item) => item.id === updatedAgendamento.id ? updatedAgendamento : item));
                setAgendamentoSelecionado(updatedAgendamento);
              } else {
                carregar();
              }
            }} 
            onReagendar={(agendamento) => {
              setPrefillAgendaData({
                clienteNome: agendamento.clienteNome,
                clienteTelefone: agendamento.clienteTelefone,
                profissionalId: agendamento.profissionalId,
                servicoIds: agendamento.servicoId ? [agendamento.servicoId] : [],
              });
              setModalDetalhes(false);
              setAgendamentoSelecionado(null);
              setModalNovo(true);
            }}
            onClose={() => { setModalDetalhes(false); setAgendamentoSelecionado(null); }} 
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={false} 
        animate={{ width: sidebarOpen ? 280 : 0 }} 
        className="bg-white/70 dark:bg-[#0c0c0e]/60 backdrop-blur-2xl border-r border-gray-200/50 dark:border-white/5 flex flex-col z-[60] shrink-0 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="p-4 md:p-8 space-y-8 w-[280px]">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none mb-2">Escala</h3>
            <p className="text-[9px] font-black text-[#d48997] uppercase tracking-widest bg-[#d48997]/10 px-3 py-1.5 rounded-lg inline-flex">CustomizaÒ§Ò£o Visual</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-6 p-4 sm:p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/20 dark:shadow-none">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-500">Largura Coluna</span>
                  <span className="text-[#d48997]">{colWidth}px</span>
                </div>
                <input type="range" min="140" max="300" value={colWidth} onChange={e => setColWidth(Number(e.target.value))} className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d48997]" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-500">Altura Hora</span>
                  <span className="text-[#d48997]">{hourHeight}px</span>
                </div>
                <input type="range" min="50" max="150" value={hourHeight} onChange={e => setHourHeight(Number(e.target.value))} className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d48997]" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Target size={12} className="text-[#E29BA8]"/> Lista de Espera</h4>
                <button onClick={adicionarListaEsperaRapida} className="px-2 py-1 bg-[#E29BA8]/10 text-[#d48997] rounded-md text-[9px] font-black uppercase tracking-widest">
                  Novo
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[28vh] overflow-y-auto pr-2 custom-scrollbar">
                {(listaEspera || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                    Nenhum cliente aguardando
                  </div>
                ) : (
                  (listaEspera || []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-tight text-gray-900 dark:text-white">{item.clienteNome}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        {item.servico?.nome || 'Sem servico definido'}
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
                          className="flex-1 rounded-xl bg-[#d48997] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white"
                        >
                          Agendar
                        </button>
                        <button
                          onClick={() => removerDaListaEspera(item.id)}
                          className="rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-500"
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
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-[#E29BA8]"/> Equipe</h4>
                <div className="px-2 py-1 bg-[#d48997]/10 text-[#d48997] rounded-md text-[9px] font-black uppercase tracking-widest">{profsDisplay.length}/{profissionais.length}</div>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                {(profissionais || []).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setProfVisiveis({...profVisiveis, [p.id]: !profVisiveis[p.id]})}
                    className={`flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 group ${profVisiveis[p.id] ? 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10 shadow-lg shadow-gray-200/50 dark:shadow-none' : 'bg-transparent border-transparent opacity-50 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs relative overflow-hidden transition-all duration-300 ${profVisiveis[p.id] ? 'bg-[#E29BA8]/10 dark:bg-[#E29BA8]/20 text-[#d48997] dark:text-[#f4d1d6]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" /> : p.nome?.[0]}
                      {profVisiveis[p.id] && <div className="absolute inset-0 border-2 border-[#E29BA8]/50 rounded-xl pointer-events-none" />}
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <p className={`text-[11px] font-black uppercase tracking-tight truncate leading-none ${profVisiveis[p.id] ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{p.nome}</p>
                      {profVisiveis[p.id] && <p className="text-[8px] text-[#E29BA8] uppercase tracking-[0.2em] mt-1 font-bold">VisÒ­vel</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Se??o BellaPro */}
        <div className="md:hidden px-3 py-3 border-b border-gray-100 dark:border-white/5 bg-white/95 dark:bg-[#0c0c0e]/92 backdrop-blur-3xl sticky top-[var(--admin-mobile-header-height,73px)] z-50 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-white shadow-sm"
              >
                <Menu size={20} />
              </button>
              <h2 className="text-[15px] font-black text-gray-950 dark:text-white truncate">Agenda</h2>
            </div>

            <div className="flex items-center gap-1">
              <button className="w-10 h-10 flex items-center justify-center rounded-2xl text-gray-700 dark:text-white">
                <Share2 size={18} />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-2xl text-gray-700 dark:text-white">
                <Bell size={18} />
              </button>
              <button onClick={carregar} className="w-10 h-10 flex items-center justify-center rounded-2xl text-gray-700 dark:text-white">
                <RefreshCw size={18} />
              </button>
              <div className="relative">
                <select className="appearance-none h-11 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-4 pr-9 text-sm font-black text-gray-900 dark:text-white outline-none">
                  <option>Dia</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-2xl bg-white dark:bg-white/5 px-2 py-1.5 border border-gray-200 dark:border-white/10 shadow-sm">
              <button onClick={() => setDataFiltro(addDays(dataFiltro, -1))} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500">
                <ChevronLeft size={18} />
              </button>
              <div className="relative px-2">
                <span className="block text-[12px] font-black text-gray-900 dark:text-[#E29BA8] uppercase tracking-tight min-w-[118px] text-center">
                  {formatDateBR(dataFiltro)}
                </span>
                <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Selecionar data da agenda" />
              </div>
              <button onClick={() => setDataFiltro(addDays(dataFiltro, 1))} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500">
                <ChevronRight size={18} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500">
                <MoreVertical size={18} />
              </button>
            </div>

            <button onClick={() => setModalNovo(true)} className="shrink-0 bg-[#E29BA8] text-[#111116] hover:bg-[#d81b6f] text-white px-5 h-12 rounded-2xl font-black text-sm shadow-[0_10px_22px_rgba(234,30,121,0.35)]">
              Agendar
            </button>
          </div>
        </div>

        <div className="hidden md:flex px-4 md:px-6 py-3 md:py-4 items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 bg-white/70 dark:bg-[#0c0c0e]/70 backdrop-blur-3xl sticky top-[var(--admin-mobile-header-height,73px)] md:top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Se??o BellaPro */}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="hidden md:flex w-12 h-12 items-center justify-center rounded-2xl border bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 hover:text-[#d48997] hover:border-[#E29BA8]/30 hover:bg-[#E29BA8]/5 transition-all shadow-sm group"
            >
              <div className="group-active:scale-95 transition-transform">
                {sidebarOpen ? <ChevronLeft size={20} /> : <Filter size={20} />}
              </div>
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-none">Agenda</h2>
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] mt-0.5 hidden md:block">Painel Operacional</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Se??o BellaPro */}
            <div className="flex items-center bg-gray-50 dark:bg-[#121214] rounded-2xl p-1 border border-gray-200 dark:border-white/5 shadow-inner">
              <button onClick={() => setDataFiltro(addDays(dataFiltro, -1))} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#d48997] hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all">
                <ChevronLeft size={16} />
              </button>
              <div className="relative px-2 md:px-4 flex items-center gap-1 md:gap-2">
                <CalendarDays size={14} className="text-[#d48997] hidden md:block" />
                <span className="font-black text-[11px] text-gray-900 dark:text-white uppercase tracking-[0.2em] w-[90px] md:w-[120px] text-center">{formatDateBR(dataFiltro)}</span>
                <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Selecionar data da agenda" />
              </div>
              <button onClick={() => setDataFiltro(addDays(dataFiltro, 1))} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#d48997] hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all">
                <ChevronRight size={16} />
              </button>
            </div>

            <button onClick={carregar} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-gray-400 hover:text-[#d48997] transition-all bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm group">
              <RefreshCw size={16} className="group-active:rotate-180 transition-transform duration-500" />
            </button>
            <button onClick={() => setModalNovo(true)} className="bg-gray-900 dark:bg-[#d48997] hover:bg-black dark:hover:bg-[#E29BA8] text-white px-4 md:px-6 py-3 h-10 md:h-12 rounded-2xl font-black text-[11px] shadow-xl dark:shadow-[#E29BA8]/20 transition-all uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} strokeWidth={3} className="text-[#efbac2]" />
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
                      <div key={p.id} className="relative flex-shrink-0 border-r border-gray-200/70 dark:border-white/5 bg-white dark:bg-[#101113]" style={{ width: mobileColWidth, height: hours.length * mobileHourHeight + 52 }}>
                        <div className="sticky top-0 z-20 h-[52px] border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111214] flex items-center justify-center px-2">
                          <p className="text-[11px] font-black text-gray-900 dark:text-white truncate">{p.nome}</p>
                        </div>
                        {hours.map((h) => (
                          <div key={h} onClick={(e) => handleGridClick(e, p.id, h)} className="w-full border-b border-gray-200/70 dark:border-white/5 relative" style={{ height: mobileHourHeight }}>
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.06)_0,rgba(148,163,184,0.06)_48%,transparent_48%,transparent_100%)] opacity-70" />
                          </div>
                        ))}
                        {bloqueios.filter(b => b.profissionalId === p.id).map((b) => {
                          const { inicioHora: inicioBloqueio, fimHora: fimBloqueio } = getBloqueioRenderWindow(b);
                          const [bh, bm] = inicioBloqueio.split(':').map(Number);
                          const [fh, fm] = fimBloqueio.split(':').map(Number);
                          const duracao = Math.max(((fh * 60 + fm) - (bh * 60 + bm)), 30);
                          return (
                            <div key={b.id} style={{ top: ((bh - START_HOUR) * mobileHourHeight) + ((bm / 60) * mobileHourHeight) + 52, height: Math.max((duracao / 60) * mobileHourHeight, 30) }} className="absolute left-1 right-1 rounded-2xl border border-dashed border-slate-300 bg-slate-100/80 dark:bg-white/5 flex items-center justify-center z-10">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{b.motivo || 'Bloqueio'}</span>
                            </div>
                          );
                        })}
                        {agendamentos.filter(a => a.profissionalId === p.id && a.status !== 'cancelado').map((a) => {
                          const duracaoTotal = (a.servico?.duracaoMin ?? a.pacote?.duracaoMin ?? 0) + (a.itens?.reduce((s, i) => s + i.duracaoMin, 0) || 0);
                          const [h, m] = (a.inicioHora || '00:00').split(':').map(Number);
                          return (
                            <motion.div
                              key={`grid-${a.id}`}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={(e) => { e.stopPropagation(); setAgendamentoSelecionado(a); setModalDetalhes(true); }}
                              style={{ top: ((h - START_HOUR) * mobileHourHeight) + ((m / 60) * mobileHourHeight) + 54, height: Math.max((duracaoTotal / 60) * mobileHourHeight - 4, 48), width: `calc(${mobileColWidth}px - 8px)` }}
                              className="absolute left-1 rounded-[14px] border border-blue-300 bg-[#bcd4fb] shadow-sm px-2.5 py-2 overflow-hidden z-20"
                            >
                              <p className="text-[10px] text-slate-700 leading-none">{a.inicioHora} - {a.fimHora}</p>
                              <p className="mt-1 text-[11px] font-black text-slate-900 leading-tight line-clamp-2">{a.clienteNome}</p>
                              <p className="mt-1 text-[9px] text-slate-800 line-clamp-2">{getAgendamentoTitulo(a)}</p>
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
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => { setAgendamentoSelecionado(a); setModalDetalhes(true); }}
                    className={`rounded-[1.5rem] border p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all ${config.bg} ${config.border}`}
                  >
                    {/* Se??o BellaPro */}
                    <div className="w-14 h-14 rounded-2xl bg-white/60 dark:bg-black/20 flex flex-col items-center justify-center flex-shrink-0 border border-white/40">
                      <span className={`text-base font-black leading-none ${config.text}`}>{a.inicioHora}</span>
                      <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-0.5">hora</span>
                    </div>
                    {/* Se??o BellaPro */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black uppercase tracking-tight truncate ${config.text} dark:text-white`}>{a.clienteNome}</p>
                      <p className="text-[10px] font-bold text-gray-500 truncate mt-0.5">{getAgendamentoTitulo(a)} â��¢ {a.profissional?.nome}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${config.bg} ${config.text} border ${config.border}`}>
                          <StatusIcon size={8} className="inline mr-1" />{config.label || a.status}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isPago ? 'text-[#E29BA8]' : 'text-bellapro-blush'}`}>
                          {isPago ? 'â��S Pago' : `R$ ${total.toFixed(2)}`}
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
          <div className="sticky top-0 z-40 flex bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-3xl border-b border-gray-200 dark:border-white/5" style={{ marginLeft: 60 }}>
            {profsDisplay.map(p => (
              <div key={p.id} className="py-5 px-3 flex flex-col items-center justify-center border-r border-gray-100 dark:border-white/5 flex-shrink-0 relative group" style={{ width: colWidth }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[#E29BA8]/0 to-[#E29BA8]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-[1.25rem] overflow-hidden bg-gray-50 dark:bg-white/5 relative z-10 shadow-lg border-2 border-white dark:border-[#1a1a1c] group-hover:border-[#E29BA8]/50 transition-all">
                  {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-300 dark:text-gray-600 text-xl uppercase">{p.nome[0]}</div>}
                </div>
                <div className="text-center mt-3 overflow-hidden w-full relative z-10">
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate px-2">{p.nome}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex" style={{ width: profsDisplay.length * colWidth + 60 }}>
            <div className="sticky left-0 w-[60px] bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-2xl border-r border-gray-200 dark:border-white/5 z-30 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.1)] dark:shadow-none">
              {hours.map(h => (
                <div key={h} className="relative border-b border-gray-100 dark:border-white/5 flex items-center justify-center" style={{ height: hourHeight }}>
                  <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest relative -top-1/2">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            <div className="flex relative">
              {profsDisplay.map(p => (
                <div key={p.id} className="relative border-r border-gray-100 dark:border-white/5 last:border-r-0 flex-shrink-0" style={{ width: colWidth, height: hours.length * hourHeight }}>
                  {hours.map(h => (
                    <div 
                      key={h} 
                      onClick={(e) => handleGridClick(e, p.id, h)}
                      className="w-full border-b border-gray-100 dark:border-white/5 group relative cursor-pointer hover:bg-[#d48997]/[0.02] dark:hover:bg-[#E29BA8]/[0.05] transition-all" 
                      style={{ height: hourHeight }}
                    >
                       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none scale-90 group-hover:scale-100 duration-300">
                          <div className="px-4 py-2 rounded-xl bg-[#d48997] text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-[#E29BA8]/30 flex items-center gap-2">
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
                      <div 
                        key={b.id}
                        style={{ top: pos.top, height: pos.height }}
                        className="absolute left-0.5 right-0.5 bg-gray-100/40 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 z-10 flex items-center justify-center overflow-hidden rounded-[1rem]"
                      >
                         <span className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest opacity-60">{b.motivo || 'Bloqueado'}</span>
                      </div>
                    );
                  })}

                  <AnimatePresence>
                    {agendamentos.filter(a => a.profissionalId === p.id && a.status !== 'cancelado').map(a => {
                      const duracaoTotal = (a.servico?.duracaoMin ?? a.pacote?.duracaoMin ?? 0) + (a.itens?.reduce((s, i) => s + i.duracaoMin, 0) || 0);
                      const pos = getPosition(a.inicioHora, duracaoTotal);
                      const config = STATUS_CONFIG[a.status] || STATUS_CONFIG.confirmado;
                      const StatusIcon = config.icon;
                      
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
                          className={`absolute left-1.5 rounded-[1.25rem] border shadow-lg ${config.bg} ${config.border} p-3 cursor-pointer overflow-hidden group hover:z-50 transition-all`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-1.5">
                              <StatusIcon size={10} className={config.text} />
                              <span className={`text-[9px] font-black uppercase tracking-widest ${config.text}`}>{a.inicioHora}</span>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                          </div>
                          
                          <p className={`text-[10px] font-black truncate uppercase tracking-tighter leading-none mb-1 ${config.text} dark:text-white`}>{a.clienteNome}</p>
                          <p className={`text-[8px] font-bold truncate uppercase tracking-widest opacity-80 ${config.text}`}>{getAgendamentoTitulo(a)}</p>

                          {pos.height > 60 && (
                            <div className="absolute bottom-2 left-3 right-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between opacity-50">
                               <p className={`text-[7px] font-black uppercase tracking-widest ${config.text}`}>{formatDurationLabel(duracaoTotal)}</p>
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
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{contextMenu.hora} - OpÒ§Òµes</p>
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
                <X size={14} /> Bloquear Horário
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
