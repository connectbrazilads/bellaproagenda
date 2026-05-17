import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
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
} from 'lucide-react';
import {
  createCliente,
  dispararCampanha,
  getClientes,
  getHistoricoCliente,
} from '../../services/api';
import { cn } from '../../lib/utils';

const STATUS_MAP = {
  ativo: {
    label: 'Fiel',
    chip: 'border-[rgba(45,111,86,0.28)] bg-[rgba(45,111,86,0.14)] text-[#9be0bb]',
    dot: 'bg-[#52c18c]',
  },
  inativo: {
    label: 'Ausente',
    chip: 'border-[rgba(214,160,84,0.28)] bg-[rgba(214,160,84,0.14)] text-[#efcb8e]',
    dot: 'bg-[#d6a054]',
  },
  perdido: {
    label: 'Perdido',
    chip: 'border-[rgba(195,98,98,0.28)] bg-[rgba(195,98,98,0.14)] text-[#f2a3a3]',
    dot: 'bg-[#d06f6f]',
  },
  sem_visita: {
    label: 'Novo',
    chip: 'border-[rgba(120,160,214,0.28)] bg-[rgba(120,160,214,0.14)] text-[#b7d0f4]',
    dot: 'bg-[#7aa5de]',
  },
};

const EMPTY_CLIENTE = {
  nome: '',
  telefone: '',
  email: '',
  instagram: '',
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
    'Ola! Sentimos sua falta aqui na BellaPro. Que tal agendar um horario para esta semana? Use o cupom VOLTA10 para 10% de desconto.'
  );
  const [novoCliente, setNovoCliente] = useState(EMPTY_CLIENTE);

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
      window.alert(error?.response?.data?.error || 'Nao foi possivel cadastrar o cliente.');
    } finally {
      setCriando(false);
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
      window.alert('Nao foi possivel disparar a campanha agora.');
    } finally {
      setEnviando(false);
    }
  }

  const clienteExpandido = useMemo(
    () => clientes.find((cliente) => cliente.id === expandido || cliente.telefone === expandido),
    [clientes, expandido]
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 md:p-8 pb-16">
      <section className="flex flex-col gap-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#E29BA8]">
            <Users className="h-4 w-4" />
            CRM BellaPro
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Base de <span className="text-[#E29BA8]">Clientes</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Organize relacionamento, historico e oportunidades com uma leitura mais elegante da sua carteira.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setModalNovo(true)}
            className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.04)] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#faf7f6] transition hover:border-[rgba(233,155,168,0.18)]"
          >
            <Plus className="h-4 w-4 text-[#f7c1b6]" />
            Novo registro
          </button>
          <button
            type="button"
            onClick={() => setModalCampanha(true)}
            className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105"
          >
            <MessageSquare className="h-4 w-4" />
            Campanha MKT
          </button>
        </div>
      </section>

      <form
        onSubmit={pesquisar}
        className="flex flex-col gap-3 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.24)] sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#806871]" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Busque por nome ou telefone..."
            className="h-14 w-full rounded-[22px] bg-transparent pl-14 pr-4 text-base text-[#faf7f6] outline-none placeholder:text-[#806871]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[rgba(233,155,168,0.14)] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#f7c1b6] transition hover:bg-[rgba(233,155,168,0.2)] disabled:opacity-60"
        >
          {loading ? 'Sincronizando...' : 'Localizar'}
        </button>
      </form>

      {erro ? (
        <div className="rounded-[24px] border border-[rgba(214,120,120,0.22)] bg-[rgba(214,120,120,0.1)] px-5 py-4 text-sm text-[#f0b7b7]">
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[rgba(233,155,168,0.22)] border-t-[#e99ba8]" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(233,155,168,0.16)] bg-[rgba(41,31,37,0.82)] px-8 py-16 text-center">
          <Users className="mx-auto h-14 w-14 text-[#806871]" />
          <h2 className="mt-6 font-['Playfair_Display'] text-3xl text-[#faf7f6]">Base vazia</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#c7adb4]">
            Cadastre o primeiro cliente ou importe sua base para iniciar o relacionamento no sistema.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:p-6">
          {clientes.map((cliente) => {
            const status = STATUS_MAP[cliente.status] || STATUS_MAP.sem_visita;
            const isExpanded = expandido === cliente.id || expandido === cliente.telefone;
            return (
              <article
                key={cliente.id || cliente.telefone}
                className={cn(
                  'rounded-[2rem] border bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] transition',
                  isExpanded
                    ? 'border-[rgba(233,155,168,0.24)]'
                    : 'border-gray-200 dark:border-white/5 hover:border-[rgba(233,155,168,0.18)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandido(isExpanded ? null : cliente.id || cliente.telefone)}
                  className="flex w-full flex-col gap-4 sm:p-6 text-left lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-[rgba(20,16,22,0.55)] text-3xl font-semibold text-[#faf7f6]">
                        {initials(cliente.nome)}
                      </div>
                      <span className={cn('absolute -right-1 -top-1 h-5 w-5 rounded-full border-2 border-[#2b2228]', status.dot)} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">{cliente.nome}</h3>
                        <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]', status.chip)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#c7adb4]">
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[#f7c1b6]" />
                          {cliente.telefone || 'Sem telefone'}
                        </span>
                        {cliente.instagram ? (
                          <span className="inline-flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-[#f7c1b6]" />
                            {cliente.instagram}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-gray-200 dark:border-white/5 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div className="text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Visitas</p>
                      <p className="mt-2 text-2xl font-semibold text-[#faf7f6]">{cliente.totalVisitas || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">LTV</p>
                      <p className="mt-2 text-2xl font-semibold text-[#f7c1b6]">{moeda(cliente.totalGasto)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E29BA8]">Ver perfil</p>
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {modalNovo ? (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalNovo(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              onSubmit={criarNovoCliente}
              className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.98)] p-4 sm:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:p-8"
            >
              <button
                type="button"
                onClick={() => setModalNovo(false)}
                className="absolute right-5 top-5 rounded-full border border-gray-200 dark:border-white/5 p-2 text-[#c7adb4] transition hover:text-[#faf7f6]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-8 border-b border-gray-200 dark:border-white/5 pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">Cadastro rapido</p>
                <h2 className="mt-3 font-['Playfair_Display'] text-2xl sm:text-4xl text-[#faf7f6]">Novo cliente</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  ['nome', 'Nome', 'text', true],
                  ['telefone', 'Telefone', 'text', true],
                  ['email', 'Email', 'email', false],
                  ['instagram', 'Instagram', 'text', false],
                  ['dataNascimento', 'Data de nascimento', 'date', false],
                  ['endereco', 'Endereco', 'text', false],
                ].map(([field, label, type, required]) => (
                  <label key={field} className={field === 'endereco' ? 'sm:col-span-2' : ''}>
                    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                      {label}
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
                      className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-gray-200 dark:border-white/5 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criando}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {criando ? 'Salvando...' : 'Salvar cliente'}
                </button>
              </div>
            </motion.form>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {modalCampanha ? (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalCampanha(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.98)] p-4 sm:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:p-8"
            >
              <button
                type="button"
                onClick={() => setModalCampanha(false)}
                className="absolute right-5 top-5 rounded-full border border-gray-200 dark:border-white/5 p-2 text-[#c7adb4] transition hover:text-[#faf7f6]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-8 border-b border-gray-200 dark:border-white/5 pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">Campanha ativa</p>
                <h2 className="mt-3 font-['Playfair_Display'] text-2xl sm:text-4xl text-[#faf7f6]">Nova campanha</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                    Publico alvo
                  </span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {['inativo', 'perdido', 'todos'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSegmento(item)}
                        className={cn(
                          'rounded-[18px] border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition',
                          segmento === item
                            ? 'border-[rgba(233,155,168,0.28)] bg-[rgba(233,155,168,0.14)] text-[#f7c1b6]'
                            : 'border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] text-[#c7adb4]'
                        )}
                      >
                        {item === 'inativo' ? 'Inativos' : item === 'perdido' ? 'Perdidos' : 'Todos'}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                    Mensagem
                  </span>
                  <textarea
                    value={msgCampanha}
                    onChange={(event) => setMsgCampanha(event.target.value)}
                    rows={6}
                    className="w-full rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 py-4 text-base leading-7 text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setModalCampanha(false)}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-gray-200 dark:border-white/5 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={disparar}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {enviando ? 'Enviando...' : 'Disparar agora'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {clienteExpandido ? (
          <div className="fixed inset-0 z-[220] flex justify-end">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setExpandido(null)}
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
              className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.98)] shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
            >
              <button
                type="button"
                onClick={() => setExpandido(null)}
                className="absolute right-5 top-5 rounded-full border border-gray-200 dark:border-white/5 p-2 text-[#c7adb4] transition hover:text-[#faf7f6]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="border-b border-gray-200 dark:border-white/5 p-4 md:p-8">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[rgba(20,16,22,0.55)] text-3xl sm:text-5xl font-semibold text-[#faf7f6]">
                  {initials(clienteExpandido.nome)}
                </div>
                <div className="mt-6 text-center">
                  <h2 className="font-['Playfair_Display'] text-2xl sm:text-4xl text-[#faf7f6]">{clienteExpandido.nome}</h2>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-[#c7adb4]">
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#f7c1b6]" />
                      {clienteExpandido.telefone || 'Sem telefone'}
                    </span>
                    {clienteExpandido.instagram ? (
                      <span className="inline-flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-[#f7c1b6]" />
                        {clienteExpandido.instagram}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 border-b border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.02)]">
                <div className="p-5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">LTV</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f7c1b6]">{moeda(clienteExpandido.totalGasto)}</p>
                </div>
                <div className="p-5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Visitas</p>
                  <p className="mt-2 text-2xl font-semibold text-[#faf7f6]">{clienteExpandido.totalVisitas || 0}</p>
                </div>
                <div className="p-5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Fidelidade</p>
                  <div className="mt-3 flex items-center justify-center gap-1 text-[#9be0bb]">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>

              <div className="space-y-8 p-4 md:p-8">
                <section className="space-y-4">
                  <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">
                    <MapPin className="h-4 w-4" />
                    Informacoes
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Ultima visita</p>
                      <p className="mt-2 text-sm text-[#faf7f6]">
                        {clienteExpandido.lastVisit
                          ? new Date(clienteExpandido.lastVisit).toLocaleDateString()
                          : 'Nunca'}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Aniversario</p>
                      <p className="mt-2 text-sm text-[#faf7f6]">
                        {clienteExpandido.dataNascimento
                          ? new Date(clienteExpandido.dataNascimento).toLocaleDateString()
                          : 'Nao informado'}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-5 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Endereco</p>
                      <p className="mt-2 text-sm text-[#faf7f6]">
                        {clienteExpandido.endereco || 'Sem endereco cadastrado'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">
                    <History className="h-4 w-4" />
                    Historico de agendamentos
                  </h3>
                  <div className="space-y-3">
                    {(clienteExpandido.agendamentos || []).length ? (
                      clienteExpandido.agendamentos
                        .slice()
                        .sort((a, b) => new Date(b.data) - new Date(a.data))
                        .slice(0, 10)
                        .map((agendamento) => (
                          <div
                            key={agendamento.id}
                            className="flex gap-4 rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-4"
                          >
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]">
                              <span className="text-lg font-semibold">
                                {new Date(agendamento.data).getDate()}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.12em]">
                                {new Date(agendamento.data).toLocaleString('pt-BR', { month: 'short' })}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#faf7f6]">
                                {agendamento.servico?.nome || agendamento.pacote?.nome || 'Servico'}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#9f848d]">
                                Com {agendamento.profissional?.nome || 'Equipe'}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-[#faf7f6]">
                                {moeda(agendamento.servico?.preco || agendamento.pacote?.preco || 0)}
                              </p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-4 sm:p-6 text-sm text-[#8f7880]">
                        Nenhum agendamento registrado.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
