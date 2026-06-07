import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Edit3,
  History,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Smartphone,
  Star,
  Users,
  X,
  Package,
} from 'lucide-react';
import {
  createCliente,
  dispararCampanha,
  getClientes,
  getHistoricoCliente,
  updateCliente,
  getClientePacotes,
  venderPacoteCliente,
  getPacotes,
  getProfissionais,
} from '../../services/api';
import { calculateAgendamentoTotal, cn } from '../../lib/utils';
import useElementWidth from '../../hooks/useElementWidth';

const STATUS_MAP = {
  ativo: {
    label: 'Fidelizado',
    chip: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  inativo: {
    label: 'Ausente',
    chip: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  perdido: {
    label: 'Perdido',
    chip: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-455',
    dot: 'bg-rose-500',
  },
  sem_visita: {
    label: 'Novo Cliente',
    chip: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
};

const EMPTY_CLIENTE = {
  nome: '',
  apelido: '',
  telefone: '',
  email: '',
  instagram: '',
  cpf: '',
  dataNascimento: '',
  endereco: '',
};

function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function initials(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase();
}

export default function Clientes() {
  const pageRef = useRef(null);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [modalCampanha, setModalCampanha] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [segmento, setSegmento] = useState('inativo');
  const [msgCampanha, setMsgCampanha] = useState(
    'Olá! Sentimos sua falta aqui na BellaPro. Que tal agendar um horário para esta semana? Use o cupom VOLTA10 para 10% de desconto.'
  );
  const [novoCliente, setNovoCliente] = useState(EMPTY_CLIENTE);
  const [clienteEdicao, setClienteEdicao] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [pacotesCliente, setPacotesCliente] = useState([]);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [modalVendaOpen, setModalVendaOpen] = useState(false);
  const [pacotesDisponiveis, setPacotesDisponiveis] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [vendaForm, setVendaForm] = useState({
    pacoteId: '',
    sessoesRestantes: 10,
    precoPago: '',
    formaPagamento: 'PIX',
    profissionalId: ''
  });
  const [salvandoVenda, setSalvandoVenda] = useState(false);

  // Carrega pacotes do cliente quando expandir
  useEffect(() => {
    if (expandido) {
      const cliente = clientes.find((c) => c.id === expandido || c.telefone === expandido);
      if (cliente) {
        carregarPacotesCliente(cliente.id);
      }
    } else {
      setPacotesCliente([]);
    }
  }, [expandido, clientes]);

  async function carregarPacotesCliente(clienteId) {
    setLoadingPacotes(true);
    try {
      const res = await getClientePacotes(clienteId);
      setPacotesCliente(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar pacotes do cliente:', err);
    } finally {
      setLoadingPacotes(false);
    }
  }

  async function abrirVendaPacote() {
    setVendaForm({
      pacoteId: '',
      sessoesRestantes: 10,
      precoPago: '',
      formaPagamento: 'PIX',
      profissionalId: ''
    });
    setModalVendaOpen(true);
    try {
      const [pacotesRes, profRes] = await Promise.all([getPacotes(), getProfissionais()]);
      setPacotesDisponiveis(pacotesRes.data || []);
      setProfissionais(profRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados para venda de pacote:', err);
    }
  }

  function handleSelectPacote(pacoteId) {
    const pkg = pacotesDisponiveis.find(p => p.id === pacoteId);
    setVendaForm(prev => ({
      ...prev,
      pacoteId,
      precoPago: pkg ? String(pkg.preco) : '',
      sessoesRestantes: pkg ? (pkg.servicos?.length || 10) : 10
    }));
  }

  async function handleSalvarVenda(e) {
    e.preventDefault();
    if (!vendaForm.pacoteId || !vendaForm.sessoesRestantes || !vendaForm.precoPago || !vendaForm.formaPagamento) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    setSalvandoVenda(true);
    try {
      const cliente = clientes.find((c) => c.id === expandido || c.telefone === expandido);
      if (!cliente) return;
      await venderPacoteCliente(cliente.id, {
        pacoteId: vendaForm.pacoteId,
        sessoesRestantes: Number(vendaForm.sessoesRestantes),
        precoPago: Number(vendaForm.precoPago),
        formaPagamento: vendaForm.formaPagamento,
        profissionalId: vendaForm.profissionalId || null
      });
      alert('Pacote vendido com sucesso!');
      setModalVendaOpen(false);
      await Promise.all([
        carregarPacotesCliente(cliente.id),
        carregarClientes()
      ]);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar venda de pacote.');
    } finally {
      setSalvandoVenda(false);
    }
  }

  const pageWidth = useElementWidth(pageRef, typeof window !== 'undefined' ? window.innerWidth : 1440);
  const isCompactPage = pageWidth < 1260;
  const isTightPage = pageWidth < 980;

  async function carregarClientes() {
    setLoading(true);
    setErro('');
    try {
      const response = await getClientes();
      setClientes(response?.data || []);
    } catch {
      setErro('Erro ao carregar base de clientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  async function pesquisar(event) {
    event?.preventDefault();
    if (!busca.trim()) {
      await carregarClientes();
      return;
    }

    setLoading(true);
    setErro('');
    try {
      const response = await getHistoricoCliente(busca.trim());
      setClientes(response?.data || []);
    } catch {
      setErro('Erro ao buscar clientes.');
    } finally {
      setLoading(false);
    }
  }

  async function criarNovoCliente(event) {
    event.preventDefault();
    setCriando(true);
    try {
      await createCliente(novoCliente);
      setModalNovo(false);
      setNovoCliente(EMPTY_CLIENTE);
      await carregarClientes();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Não foi possível cadastrar o cliente.');
    } finally {
      setCriando(false);
    }
  }

  async function salvarEdicaoCliente(event) {
    event.preventDefault();
    if (!clienteEdicao?.id) return;

    setSalvandoEdicao(true);
    try {
      await updateCliente(clienteEdicao.id, clienteEdicao);
      await carregarClientes();
      setExpandido(clienteEdicao.id);
      setClienteEdicao(null);
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Não foi possível atualizar o cadastro do cliente.');
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function disparar() {
    const alvos = clientes.filter((cliente) => segmento === 'todos' || cliente.status === segmento);
    if (!alvos.length) {
      window.alert('Nenhum cliente encontrado nesse segmento.');
      return;
    }

    if (!window.confirm(`Confirmar envio para ${alvos.length} clientes?`)) return;

    setEnviando(true);
    try {
      await dispararCampanha({
        telefones: alvos.map((cliente) => cliente.telefone).filter(Boolean),
        mensagem: msgCampanha,
      });
      window.alert('Campanha disparada com sucesso.');
      setModalCampanha(false);
    } catch {
      window.alert('Não foi possível disparar a campanha agora.');
    } finally {
      setEnviando(false);
    }
  }

  const clienteExpandido = useMemo(
    () => clientes.find((cliente) => cliente.id === expandido || cliente.telefone === expandido),
    [clientes, expandido]
  );

  return (
    <div ref={pageRef} className="mx-auto flex max-w-7xl flex-col gap-5 pb-16 px-4">
      <section className={cn(
        'flex flex-col gap-4 rounded-2xl border border-black/[0.04] bg-white/60 dark:border-white/5 dark:bg-[#0c0c0e]/95 p-5 md:p-8 backdrop-blur-md shadow-sm',
        !isCompactPage && 'lg:flex-row lg:items-center lg:justify-between'
      )}>
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d48997]">
            <Users className="h-4 w-4" />
            <span>Gestão de Relacionamento (CRM)</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="font-serif font-normal text-2xl md:text-3xl text-gray-905 dark:text-white leading-tight">
              Base de <span className="text-[#d48997]">Clientes</span>
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed font-normal">
              Acompanhe o engajamento, histórico de consumo e envie campanhas personalizadas para a sua base.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setModalNovo(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.06] bg-white px-5 py-2.5 text-xs font-semibold text-gray-750 dark:border-white/10 dark:bg-white/5 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
          >
            <Plus className="h-4 w-4 text-[#d48997]" />
            <span>Novo Registro</span>
          </button>
          <button
            type="button"
            onClick={() => setModalCampanha(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Campanha MKT</span>
          </button>
        </div>
      </section>

      {/* Search form */}
      <form
        onSubmit={pesquisar}
        className={cn(
          'flex flex-col gap-3 rounded-2xl border border-black/[0.04] dark:border-white/5 bg-white/40 dark:bg-[#0c0c0e]/30 backdrop-blur-md p-3.5 shadow-sm',
          !isTightPage && 'sm:flex-row'
        )}
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, apelido ou telefone..."
            className="h-11 w-full rounded-xl bg-transparent pl-11 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white focus:ring-0"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-[#d48997]/10 hover:bg-[#d48997]/15 px-5 py-2.5 text-xs font-semibold text-[#d48997] transition disabled:opacity-60 shrink-0"
        >
          {loading ? 'Sincronizando...' : 'Localizar'}
        </button>
      </form>

      {erro && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-500">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-[#d48997]" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[0.06] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] px-8 py-16 text-center shadow-sm">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 font-serif font-normal text-xl text-gray-905 dark:text-white">Nenhum cliente registrado</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-400 dark:text-gray-500">
            Cadastre seu primeiro cliente ou refine sua busca atual para iniciar a gestão do ecossistema.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {clientes.map((cliente) => {
            const status = STATUS_MAP[cliente.status] || STATUS_MAP.sem_visita;
            const isExpanded = expandido === cliente.id || expandido === cliente.telefone;
            return (
              <article
                key={cliente.id || cliente.telefone}
                className={cn(
                  'rounded-2xl border bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 hover:shadow-md transition-all duration-300',
                  isExpanded
                    ? 'border-[#d48997]/30 shadow-sm'
                    : 'border-black/[0.04] dark:border-white/[0.04]'
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandido(isExpanded ? null : cliente.id || cliente.telefone)}
                  className={cn(
                    'flex w-full flex-col gap-4 text-left',
                    !isCompactPage && 'lg:flex-row lg:items-center lg:justify-between'
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-2xl font-semibold text-gray-750 dark:text-[#faf7f6] border border-black/[0.04]">
                        {initials(cliente.apelido || cliente.nome)}
                      </div>
                      <span className={cn('absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#131118]', status.dot)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif font-normal text-lg sm:text-xl text-gray-900 dark:text-white leading-tight truncate">{cliente.apelido || cliente.nome}</h3>
                        <span className={cn('rounded-full border px-2.5 py-0.5 text-[9px] font-semibold tracking-wide normal-case shrink-0', status.chip)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#d48997]" />
                          {cliente.telefone || 'Sem telefone'}
                        </span>
                        {cliente.instagram && (
                          <span className="inline-flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5 text-[#d48997]" />
                            {cliente.instagram}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    'grid gap-4 border-t border-black/[0.03] pt-4 dark:border-white/5 w-full lg:w-auto shrink-0',
                    isTightPage ? 'grid-cols-2' : 'grid-cols-3',
                    !isCompactPage && 'lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:grid-cols-[80px_120px_100px]'
                  )}>
                    <div className={cn(isTightPage ? 'text-left' : 'text-center sm:text-left lg:text-center')}>
                      <p className="text-[10px] font-medium normal-case text-gray-400 dark:text-gray-500">Visitas</p>
                      <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">{cliente.totalVisitas || 0}</p>
                    </div>
                    <div className={cn(isTightPage ? 'text-left' : 'text-center sm:text-left lg:text-center')}>
                      <p className="text-[10px] font-medium normal-case text-gray-400 dark:text-gray-500">Faturamento LTV</p>
                      <p className="mt-0.5 text-base font-semibold text-[#d48997]">{moeda(cliente.totalGasto)}</p>
                    </div>
                    <div className={cn(isTightPage ? 'col-span-2 text-left' : 'text-right sm:text-left lg:text-right flex items-center justify-end')}>
                      <p className="text-xs font-semibold text-[#d48997] hover:underline normal-case">Ver perfil →</p>
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Novo Cliente */}
      <AnimatePresence>
        {modalNovo && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalNovo(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.form
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              onSubmit={criarNovoCliente}
              className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]/95 custom-scrollbar sm:p-6 md:p-8"
            >
              <button
                type="button"
                onClick={() => setModalNovo(false)}
                className="absolute right-4 top-4 rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-6 border-b border-black/[0.03] dark:border-white/5 pb-4">
                <p className="text-[10px] font-semibold text-[#d48997]">Ficha do Cliente</p>
                <h2 className="mt-1 font-serif font-normal text-xl sm:text-2xl text-gray-905 dark:text-white">Novo registro</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['nome', 'Nome completo', 'text', true],
                  ['apelido', 'Como chamar (apelido)', 'text', false],
                  ['telefone', 'Telefone principal', 'text', true],
                  ['email', 'Endereço de e-mail', 'email', false],
                  ['instagram', 'Usuário Instagram', 'text', false],
                  ['cpf', 'Documento CPF', 'text', false],
                  ['dataNascimento', 'Data de nascimento', 'date', false],
                  ['endereco', 'Endereço residencial', 'text', false],
                ].map(([field, label, type, required]) => (
                  <label key={field} className={field === 'endereco' ? 'sm:col-span-2' : ''}>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      {label} {required && <span className="text-rose-500">*</span>}
                    </span>
                    <input
                      type={type}
                      required={required}
                      value={novoCliente[field]}
                      onChange={(event) =>
                        setNovoCliente((prev) => ({
                          ...prev,
                          [field]: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:text-white px-5 py-2.5 text-xs font-semibold text-gray-500 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criando}
                  className="inline-flex items-center justify-center rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-70"
                >
                  {criando ? 'Criando...' : 'Criar Registro'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Campanha MKT */}
      <AnimatePresence>
        {modalCampanha && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalCampanha(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]/95 custom-scrollbar sm:p-6 md:p-8"
            >
              <button
                type="button"
                onClick={() => setModalCampanha(false)}
                className="absolute right-4 top-4 rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-6 border-b border-black/[0.03] dark:border-white/5 pb-4">
                <p className="text-[10px] font-semibold text-[#d48997]">Campanhas e Promoções</p>
                <h2 className="mt-1 font-serif font-normal text-xl sm:text-2xl text-gray-905 dark:text-white">Campanha de marketing</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="mb-2.5 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    Selecione o segmento do público-alvo
                  </span>
                  <div className={cn('grid gap-3.5', !isTightPage && 'sm:grid-cols-3')}>
                    {['inativo', 'perdido', 'todos'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSegmento(item)}
                        className={cn(
                          'rounded-xl border px-4 py-2.5 text-xs font-semibold transition',
                          segmento === item
                            ? 'border-[#d48997] bg-[#d48997]/10 text-[#d48997]'
                            : 'border-black/[0.04] bg-gray-50/50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
                        )}
                      >
                        {item === 'inativo' ? 'Inativos' : item === 'perdido' ? 'Perdidos' : 'Todos os Clientes'}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    Texto da mensagem (WhatsApp/E-mail)
                  </span>
                  <textarea
                    value={msgCampanha}
                    onChange={(event) => setMsgCampanha(event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:bg-[#111113] dark:border-white/10 focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all resize-none"
                  />
                </label>

                <div className="flex flex-col gap-3.5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalCampanha(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:text-white px-5 py-2.5 text-xs font-semibold text-gray-500 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={disparar}
                    className="inline-flex items-center justify-center rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-70"
                  >
                    {enviando ? 'Processando...' : 'Disparar Campanha'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edição Cliente */}
      <AnimatePresence>
        {clienteEdicao && (
          <div className="fixed inset-0 z-[215] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClienteEdicao(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.form
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              onSubmit={salvarEdicaoCliente}
              className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]/95 custom-scrollbar sm:p-6 md:p-8"
            >
              <button
                type="button"
                onClick={() => setClienteEdicao(null)}
                className="absolute right-4 top-4 rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-6 border-b border-black/[0.03] dark:border-white/5 pb-4">
                <p className="text-[10px] font-semibold text-[#d48997]">Atualização cadastral</p>
                <h2 className="mt-1 font-serif font-normal text-xl sm:text-2xl text-gray-905 dark:text-white">Editar cadastro</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['nome', 'Nome do cadastro', 'text', true],
                  ['apelido', 'Como chamar', 'text', false],
                  ['telefone', 'Telefone principal', 'text', true],
                  ['email', 'Endereço de e-mail', 'email', false],
                  ['instagram', 'Instagram', 'text', false],
                  ['cpf', 'CPF', 'text', false],
                  ['dataNascimento', 'Data de nascimento', 'date', false],
                  ['endereco', 'Endereço residencial', 'text', false],
                ].map(([field, label, type, required]) => (
                  <label key={field} className={field === 'endereco' ? 'sm:col-span-2' : ''}>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      {label} {required && <span className="text-rose-500">*</span>}
                    </span>
                    <input
                      type={type}
                      required={required}
                      value={clienteEdicao[field] || ''}
                      onChange={(event) =>
                        setClienteEdicao((prev) => ({
                          ...prev,
                          [field]: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setClienteEdicao(null)}
                  className="inline-flex items-center justify-center rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:text-white px-5 py-2.5 text-xs font-semibold text-gray-500 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="inline-flex items-center justify-center rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-70"
                >
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Drawer Perfil Detalhado */}
      <AnimatePresence>
        {clienteExpandido && (
          <div className="fixed inset-0 z-[220] flex justify-end">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setExpandido(null)}
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 240, damping: 30 }}
              className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-black/[0.04] bg-white shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]/98 modal-scrollbar"
            >
              <button
                type="button"
                onClick={() => setExpandido(null)}
                className="absolute right-4 top-4 rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm z-10 bg-white dark:bg-[#0c0c0e]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="border-b border-black/[0.03] dark:border-white/5 p-6 md:p-8">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/5 text-4xl font-semibold text-gray-750 dark:text-[#faf7f6] border border-black/[0.04]">
                  {initials(clienteExpandido.apelido || clienteExpandido.nome)}
                </div>
                <div className="mt-5 text-center">
                  <h2 className="font-serif font-normal text-2xl sm:text-3xl text-gray-905 dark:text-white leading-tight">{clienteExpandido.apelido || clienteExpandido.nome}</h2>
                  {clienteExpandido.apelido && (
                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nome de registro: {clienteExpandido.nome}</p>
                  )}
                  <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-[#d48997]" />
                      {clienteExpandido.telefone || 'Sem telefone'}
                    </span>
                    {clienteExpandido.cpf && (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[#d48997] font-semibold">CPF:</span>
                        {clienteExpandido.cpf}
                      </span>
                    )}
                    {clienteExpandido.instagram && (
                      <span className="inline-flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-[#d48997]" />
                        {clienteExpandido.instagram}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setClienteEdicao({
                      id: clienteExpandido.id,
                      nome: clienteExpandido.nome || '',
                      apelido: clienteExpandido.apelido || '',
                      telefone: clienteExpandido.telefone || '',
                      email: clienteExpandido.email || '',
                      instagram: clienteExpandido.instagram || '',
                      cpf: clienteExpandido.cpf || '',
                      dataNascimento: clienteExpandido.dataNascimento ? String(clienteExpandido.dataNascimento).slice(0, 10) : '',
                      endereco: clienteExpandido.endereco || '',
                    })}
                    className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/[0.04] px-4.5 py-2 text-xs font-semibold text-gray-650 dark:border-white/10 dark:text-white shadow-sm hover:bg-gray-50 transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-[#d48997]" />
                    <span>Editar cadastro</span>
                  </button>
                </div>
              </div>

              <div className="grid border-b border-black/[0.03] bg-black/[0.01] dark:bg-white/[0.01] dark:border-white/5 grid-cols-3">
                <div className="p-4.5 text-center">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-550">Faturamento LTV</p>
                  <p className="mt-1 text-lg font-semibold text-[#d48997]">{moeda(clienteExpandido.totalGasto)}</p>
                </div>
                <div className="p-4.5 text-center border-l border-r border-black/[0.03] dark:border-white/5">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-555">Total Visitas</p>
                  <p className="mt-1 text-lg font-semibold text-gray-905 dark:text-white">{clienteExpandido.totalVisitas || 0}</p>
                </div>
                <div className="p-4.5 text-center">
                  <p className="text-[10px] font-medium text-gray-400 dark:text-gray-550">Fidelidade</p>
                  <div className="mt-2.5 flex items-center justify-center gap-1 text-emerald-500">
                    <Star className="h-4 w-4 fill-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 md:p-8">
                <section className="space-y-3.5">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-905 dark:text-white normal-case">
                    <MapPin className="h-4 w-4 text-[#d48997]" />
                    <span>Dados de Cadastro</span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-black/[0.04] bg-black/[0.01] dark:bg-white/[0.01] dark:border-white/5 p-4">
                      <p className="text-[10px] font-medium text-gray-405">Última Visita</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {clienteExpandido.lastVisit
                          ? new Date(clienteExpandido.lastVisit).toLocaleDateString()
                          : 'Nenhuma visita registrada'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/[0.04] bg-black/[0.01] dark:bg-white/[0.01] dark:border-white/5 p-4">
                      <p className="text-[10px] font-medium text-gray-405">Aniversário</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {clienteExpandido.dataNascimento
                          ? new Date(clienteExpandido.dataNascimento).toLocaleDateString()
                          : 'Não informado'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/[0.04] bg-black/[0.01] dark:bg-white/[0.01] dark:border-white/5 p-4">
                      <p className="text-[10px] font-medium text-gray-455">Documento CPF</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {clienteExpandido.cpf || 'Não informado'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/[0.04] bg-black/[0.01] dark:bg-white/[0.01] dark:border-white/5 p-4 sm:col-span-2">
                      <p className="text-[10px] font-medium text-gray-455">Endereço Residencial</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                        {clienteExpandido.endereco || 'Nenhum endereço cadastrado'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-905 dark:text-white normal-case">
                      <Package className="h-4 w-4 text-[#d48997]" />
                      <span>Pacotes Adquiridos</span>
                    </h3>
                    <button
                      type="button"
                      onClick={abrirVendaPacote}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#d48997] hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Vender Pacote</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {loadingPacotes ? (
                      <div className="flex justify-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
                      </div>
                    ) : pacotesCliente.length ? (
                      pacotesCliente.map((cp) => (
                        <div
                          key={cp.id}
                          className="flex gap-4 rounded-2xl border border-black/[0.04] bg-white dark:bg-white/[0.01] dark:border-white/5 p-4 items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-905 dark:text-white">
                              {cp.pacote?.nome}
                            </p>
                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                              Adquirido em {new Date(cp.dataCompra).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center rounded-lg bg-[#d48997]/10 border border-[#d48997]/20 px-2 py-1 text-[11px] font-bold text-[#d48997]">
                              {cp.sessoesRestantes} sessões
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-black/[0.06] dark:border-white/10 px-4 py-6 text-center text-xs text-gray-400">
                        Nenhum pacote ativo cadastrado para este cliente.
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-3.5">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-905 dark:text-white normal-case">
                    <History className="h-4 w-4 text-[#d48997]" />
                    <span>Histórico de Agendamentos</span>
                  </h3>
                  <div className="space-y-2.5">
                    {(clienteExpandido.agendamentos || []).length ? (
                      clienteExpandido.agendamentos
                        .slice()
                        .sort((a, b) => new Date(b.data) - new Date(a.data))
                        .slice(0, 10)
                        .map((agendamento) => (
                          <div
                            key={agendamento.id}
                            className="flex gap-4 rounded-2xl border border-black/[0.04] bg-white dark:bg-white/[0.01] dark:border-white/5 p-4 items-center justify-between"
                          >
                            <div className="flex gap-3 items-center min-w-0">
                              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997] border border-[#d48997]/20">
                                <span className="text-sm font-bold">
                                  {new Date(agendamento.data).getDate()}
                                </span>
                                <span className="text-[8px] font-medium uppercase tracking-wider -mt-0.5">
                                  {new Date(agendamento.data).toLocaleString('pt-BR', { month: 'short' })}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-905 dark:text-white">
                                  {agendamento.servico?.nome || agendamento.pacote?.nome || 'Serviço'}
                                </p>
                                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">
                                  com {agendamento.profissional?.nome || 'Equipe'}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {moeda(calculateAgendamentoTotal(agendamento))}
                              </p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-black/[0.06] dark:border-white/10 px-4 py-8 text-center text-xs text-gray-400">
                        Nenhum agendamento registrado.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Vender Pacote */}
      <AnimatePresence>
        {modalVendaOpen && (
          <div className="fixed inset-0 z-[230] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalVendaOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#18181b] shadow-xl"
            >
              <form onSubmit={handleSalvarVenda} className="flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 px-6 py-4">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">
                      Registrar Venda
                    </span>
                    <h2 className="mt-0.5 font-serif text-lg font-normal text-gray-900 dark:text-white">
                      Vender Pacote
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalVendaOpen(false)}
                    className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5 space-y-4 text-gray-800 dark:text-gray-100">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium text-gray-405">
                      Selecione o Pacote <span className="text-rose-500">*</span>
                    </span>
                    <select
                      value={vendaForm.pacoteId}
                      onChange={(e) => handleSelectPacote(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                    >
                      <option value="">Selecione um pacote...</option>
                      {pacotesDisponiveis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({Number(p.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="mb-2 block text-[10px] font-medium text-gray-405">
                        Sessões Incluídas <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={vendaForm.sessoesRestantes}
                        onChange={(e) => setVendaForm(prev => ({ ...prev, sessoesRestantes: Number(e.target.value || 0) }))}
                        required
                        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                      />
                    </div>

                    <div>
                      <span className="mb-2 block text-[10px] font-medium text-gray-405">
                        Preço Pago (R$) <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={vendaForm.precoPago}
                        onChange={(e) => setVendaForm(prev => ({ ...prev, precoPago: e.target.value }))}
                        required
                        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="mb-2 block text-[10px] font-medium text-gray-405">
                        Forma de Pagamento <span className="text-rose-500">*</span>
                      </span>
                      <select
                        value={vendaForm.formaPagamento}
                        onChange={(e) => setVendaForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                        required
                        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartao de Credito">Cartão de Crédito</option>
                        <option value="Cartao de Debito">Cartão de Débito</option>
                      </select>
                    </div>

                    <div>
                      <span className="mb-2 block text-[10px] font-medium text-gray-405">
                        Profissional Vendedor
                      </span>
                      <select
                        value={vendaForm.profissionalId}
                        onChange={(e) => setVendaForm(prev => ({ ...prev, profissionalId: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                      >
                        <option value="">Selecione o profissional...</option>
                        {profissionais.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setModalVendaOpen(false)}
                    className="h-10 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoVenda}
                    className="h-10 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] px-5 text-xs font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {salvandoVenda ? 'Processando...' : 'Confirmar Venda'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
