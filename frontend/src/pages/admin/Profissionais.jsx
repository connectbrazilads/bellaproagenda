import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
  Scissors,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import {
  getCategoriasServicos,
  createCategoriaProfissional,
  createProfissional,
  deleteCategoriaProfissional,
  deleteProfissional,
  getCategoriasProfissionais,
  getProfissionais,
  getServicos,
  setHorariosProfissional,
  updateProfissional,
  getAdminSalao,
} from '../../services/api';
import { cn } from '../../lib/utils';
import ImageUpload from '../../components/ImageUpload';
import useElementWidth from '../../hooks/useElementWidth';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const TABS = [
  { id: 'geral', label: 'Geral', icon: User },
  { id: 'contato', label: 'Contato', icon: Mail },
  { id: 'endereco', label: 'Endereço', icon: MapPin },
  { id: 'servicos', label: 'Serviços', icon: Scissors },
  { id: 'banco', label: 'Banco e Pix', icon: CreditCard },
];

const EMPTY_FORM = {
  nome: '',
  bio: '',
  fotoUrl: '',
  servicos: [],
  categoriasIds: [],
  servicoCategoriasIds: [],
  comissaoPercent: 50,
  ativo: true,
  email: '',
  telefone: '',
  cpf: '',
  rg: '',
  dataNascimento: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  cidade: '',
  estado: '',
  banco: '',
  agencia: '',
  conta: '',
  pix: '',
  metaMensal: 0,
  bonusMetaValor: 0,
  bonusMetaPercent: 0,
};

export default function Profissionais() {
  const pageRef = useRef(null);
  const role = localStorage.getItem('salao_user_role');
  const myProfissionalId = localStorage.getItem('salao_user_pid') || '';
  const isScopedProfessional = role === 'profissional' && Boolean(myProfissionalId);

  const [profissionais, setProfissionais] = useState([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState([]);
  const [categoriasServicosDisponiveis, setCategoriasServicosDisponiveis] = useState([]);
  const [salaoInfo, setSalaoInfo] = useState(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionMenuModal, setActionMenuModal] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const pageWidth = useElementWidth(pageRef, typeof window !== 'undefined' ? window.innerWidth : 1440);
  const isCompactPage = pageWidth < 1380;
  const showSummaryCard = pageWidth >= 1480;
  const showThreeCards = pageWidth >= 1520;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [profissionaisResponse, servicosResponse, categoriasResponse, categoriasServicosResponse, salaoResponse] = await Promise.all([
      getProfissionais(),
      getServicos(),
      getCategoriasProfissionais(),
      getCategoriasServicos(),
      getAdminSalao(),
    ]);

    setProfissionais(profissionaisResponse.data || []);
    setServicosDisponiveis(servicosResponse.data || []);
    setCategoriasDisponiveis(categoriasResponse.data || []);
    setCategoriasServicosDisponiveis(categoriasServicosResponse.data || []);
    setSalaoInfo(salaoResponse.data || null);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setActiveTab('geral');
    setModalOpen(true);
  }

  function openEdit(profissional, tab = 'geral') {
    setForm({
      nome: profissional.nome || '',
      bio: profissional.bio || '',
      fotoUrl: profissional.fotoUrl || '',
      servicos: (profissional.servicos || []).map((item) => ({
        id: item.servicoId,
        comissaoPercent: item.comissaoPercent,
        comissaoValor: item.comissaoValor,
      })),
      categoriasIds: (profissional.categorias || []).map((item) => item.categoriaId),
      servicoCategoriasIds: (profissional.servicoCategorias || []).map((item) => item.categoriaId),
      comissaoPercent: profissional.comissaoPercent || 50,
      ativo: profissional.ativo !== false,
      email: profissional.email || '',
      telefone: profissional.telefone || '',
      cpf: profissional.cpf || '',
      rg: profissional.rg || '',
      dataNascimento: profissional.dataNascimento ? profissional.dataNascimento.slice(0, 10) : '',
      endereco: profissional.endereco || '',
      numero: profissional.numero || '',
      complemento: profissional.complemento || '',
      bairro: profissional.bairro || '',
      cep: profissional.cep || '',
      cidade: profissional.cidade || '',
      estado: profissional.estado || '',
      banco: profissional.banco || '',
      agencia: profissional.agencia || '',
      conta: profissional.conta || '',
      pix: profissional.pix || '',
      metaMensal: profissional.metaMensal || 0,
      bonusMetaValor: profissional.bonusMetaValor || 0,
      bonusMetaPercent: profissional.bonusMetaPercent || 0,
    });
    setEditingId(profissional.id);
    setActiveTab(tab);
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateProfissional(editingId, form);
      } else {
        await createProfissional(form);
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Deseja excluir este profissional?')) return;
    await deleteProfissional(id);
    await loadData();
  }

  function openSchedules(profissional) {
    setScheduleModal(profissional);
    setHorarios(profissional.horarios?.length ? profissional.horarios : []);
  }

  function toggleDia(diaSemana) {
    const exists = horarios.find((horario) => horario.diaSemana === diaSemana);
    if (exists) {
      setHorarios((prev) => prev.filter((horario) => horario.diaSemana !== diaSemana));
      return;
    }

    setHorarios((prev) => [
      ...prev,
      { diaSemana, inicioHora: '09:00', fimHora: '18:00', intervaloMin: 30 },
    ]);
  }

  function updateHorario(diaSemana, field, value) {
    setHorarios((prev) =>
      prev.map((horario) =>
        horario.diaSemana === diaSemana ? { ...horario, [field]: value } : horario
      )
    );
  }

  async function saveSchedules() {
    setSaving(true);
    try {
      await setHorariosProfissional(scheduleModal.id, horarios);
      setScheduleModal(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function toggleServico(servicoId) {
    const exists = form.servicos.find((servico) => servico.id === servicoId);
    if (exists) {
      setForm((prev) => ({ ...prev, servicos: prev.servicos.filter((servico) => servico.id !== servicoId) }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      servicos: [...prev.servicos, { id: servicoId, comissaoPercent: null, comissaoValor: null }],
    }));
  }

  function updateServicoComissao(servicoId, field, value) {
    setForm((prev) => ({
      ...prev,
      servicos: prev.servicos.map((servico) =>
        servico.id === servicoId
          ? { ...servico, [field]: value === '' ? null : Number(value) }
          : servico
      ),
    }));
  }

  function toggleCategoria(categoriaId) {
    setForm((prev) => ({
      ...prev,
      categoriasIds: prev.categoriasIds.includes(categoriaId)
        ? prev.categoriasIds.filter((id) => id !== categoriaId)
        : [...prev.categoriasIds, categoriaId],
    }));
  }

  function toggleCategoriaServico(categoriaId) {
    setForm((prev) => ({
      ...prev,
      servicoCategoriasIds: prev.servicoCategoriasIds.includes(categoriaId)
        ? prev.servicoCategoriasIds.filter((id) => id !== categoriaId)
        : [...prev.servicoCategoriasIds, categoriaId],
    }));
  }

  async function addCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const response = await createCategoriaProfissional({ nome });
    const categoria = response.data;
    setCategoriasDisponiveis((prev) => [...prev, categoria].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm((prev) => ({ ...prev, categoriasIds: [...new Set([...prev.categoriasIds, categoria.id])] }));
    setNovaCategoria('');
  }

  async function removeCategoria(categoriaId) {
    if (!window.confirm('Deseja excluir esta categoria do salão inteiro?')) return;
    await deleteCategoriaProfissional(categoriaId);
    setCategoriasDisponiveis((prev) => prev.filter((categoria) => categoria.id !== categoriaId));
    setForm((prev) => ({ ...prev, categoriasIds: prev.categoriasIds.filter((id) => id !== categoriaId) }));
    await loadData();
  }

  const visibleProfessionals = useMemo(() => {
    if (!isScopedProfessional) return profissionais;
    return profissionais.filter((profissional) => profissional.id === myProfissionalId);
  }, [isScopedProfessional, myProfissionalId, profissionais]);

  const servicoIdsPorCategoriaSelecionada = useMemo(() => {
    const ids = new Set();
    for (const categoria of categoriasServicosDisponiveis) {
      if (!form.servicoCategoriasIds.includes(categoria.id)) continue;
      for (const servico of categoria.servicos || []) {
        if (servico?.id) ids.add(servico.id);
      }
    }
    return ids;
  }, [categoriasServicosDisponiveis, form.servicoCategoriasIds]);

  const servicosVinculadosNoFormulario = useMemo(() => {
    const mapa = new Map();

    for (const categoria of categoriasServicosDisponiveis) {
      if (!form.servicoCategoriasIds.includes(categoria.id)) continue;
      for (const servico of categoria.servicos || []) {
        if (!servico?.id || mapa.has(servico.id)) continue;
        mapa.set(servico.id, {
          id: servico.id,
          nome: servico.nome,
          inherited: true,
          categoriaNome: categoria.nome,
        });
      }
    }

    for (const servicoManual of form.servicos) {
      const servico = servicosDisponiveis.find((item) => item.id === servicoManual.id);
      if (!servico) continue;
      mapa.set(servico.id, {
        id: servico.id,
        nome: servico.nome,
        inherited: servicoIdsPorCategoriaSelecionada.has(servico.id),
        categoriaNome: mapa.get(servico.id)?.categoriaNome || null,
      });
    }

    return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [categoriasServicosDisponiveis, form.servicoCategoriasIds, form.servicos, servicoIdsPorCategoriaSelecionada, servicosDisponiveis]);

  return (
    <motion.div ref={pageRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/5 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#d48997]">
          <Scissors className="h-4 w-4" />
          <span>Equipe e Disponibilidade</span>
        </div>
        <div className={cn('flex flex-col gap-4', !isCompactPage && 'lg:flex-row lg:items-center lg:justify-between')}>
          <div>
            <h1 className="font-serif font-normal text-2xl md:text-3xl text-gray-905 dark:text-white leading-tight">
              Profissionais da <span className="text-[#d48997]">Casa</span>
            </h1>
            <p className="mt-1.5 text-sm text-gray-400 dark:text-gray-500 font-normal">
              Gerencie os cadastros da equipe, comissões individuais, serviços atendidos e escala de trabalho.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className={cn('rounded-xl border border-black/[0.04] dark:border-white/5 bg-white/40 dark:bg-white/[0.01] px-5 py-3 items-center gap-6 shadow-sm', showSummaryCard ? 'flex' : 'hidden')}>
              <MiniMetric label="Profissionais ativos" value={visibleProfessionals.filter((item) => item.ativo).length} />
              <MiniMetric label="Serviços cadastrados" value={servicosDisponiveis.length} highlight />
            </div>

            {!isScopedProfessional && (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  onClick={openCreate}
                  disabled={salaoInfo && profissionais.length >= salaoInfo.maxProfissionais}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d48997] to-[#e29ba8] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  <span>Novo Profissional</span>
                </button>
                {salaoInfo && profissionais.length >= salaoInfo.maxProfissionais && (
                  <p className="text-[10px] text-[#efbac2] mt-1">
                    Limite máximo de {salaoInfo.maxProfissionais} profissionais atingido.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={cn('grid gap-4 md:grid-cols-2', showThreeCards && 'xl:grid-cols-3')}>
        <AnimatePresence mode="popLayout">
          {visibleProfessionals.map((profissional) => (
            <motion.article
              key={profissional.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="relative shrink-0">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50 dark:bg-white/5">
                      {profissional.fotoUrl ? (
                        <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-400 dark:text-white/20">
                          {profissional.nome?.[0] || 'P'}
                        </div>
                      )}
                    </div>
                    <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-[#0c0c0e] ${profissional.ativo ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                      <Activity size={9} className="text-white" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif font-normal text-lg sm:text-xl text-gray-905 dark:text-white truncate leading-snug">{profissional.nome}</h2>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={9} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 normal-case">Especialista BellaPro</span>
                    </div>
                  </div>
                </div>

                {profissional.bio && (
                  <p className="mt-3.5 line-clamp-2 text-xs italic text-gray-455 dark:text-gray-400 leading-relaxed">"{profissional.bio}"</p>
                )}

                <div className="mt-4 rounded-xl border border-black/[0.03] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                      <Tag size={13} />
                      <span className="text-[10px] font-medium normal-case">Categorias</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#d48997]">
                      {(profissional.categorias || []).length} vinculadas
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(profissional.categorias || []).slice(0, 3).map((item) => (
                      <span key={item.categoriaId} className="rounded-full border border-black/[0.04] dark:border-white/10 bg-white/40 dark:bg-white/5 px-2.5 py-0.5 text-[10px] font-medium tracking-wide normal-case text-gray-600 dark:text-white/60">
                        {item.categoria?.nome}
                      </span>
                    ))}
                    {(!profissional.categorias || profissional.categorias.length === 0) && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">Sem categorias definidas</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={() => setActionMenuModal(profissional)} className="rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-white/80 flex items-center justify-center gap-1.5 transition hover:bg-gray-50 dark:hover:bg-white/10">
                  <Edit3 size={13} />
                  <span>Editar</span>
                </button>
                <button onClick={() => openSchedules(profissional)} className="rounded-xl bg-[#d48997]/10 hover:bg-[#d48997]/15 text-[#d48997] px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                  <Calendar size={13} />
                  <span>Escala</span>
                </button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#0c0c0e] lg:flex-row">
            <aside className="w-full border-b border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-[#111113]/95 p-5 lg:w-72 lg:border-b-0 lg:border-r shrink-0">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997]">
                    <User size={18} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-normal text-gray-905 dark:text-white">{editingId ? 'Editar' : 'Novo'} Profissional</h2>
                  <p className="mt-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    Carreira, escala e configurações.
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="rounded-xl border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm z-10">
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-1 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold normal-case transition shrink-0 lg:w-full',
                        active
                          ? 'bg-[#d48997] text-white shadow-sm'
                          : 'bg-transparent text-gray-400 dark:text-gray-500 hover:bg-black/[0.02] dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white'
                      )}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5 custom-scrollbar sm:p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'geral' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nome artístico ou completo" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
                      <Field label="Biografia ou especialidade" value={form.bio} onChange={(value) => setForm((prev) => ({ ...prev, bio: value }))} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                      <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-[#d48997]">Categorias Profissionais</p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-550 leading-relaxed font-normal">
                            Vincule o profissional às categorias correspondentes na plataforma (ex: Barbeiro, Manicure).
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 md:flex-row">
                          <input
                            value={novaCategoria}
                            onChange={(event) => setNovaCategoria(event.target.value)}
                            placeholder="Criar nova categoria"
                            className="flex-1 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                          />
                          <button type="button" onClick={addCategoria} className="rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-4 py-2.5 text-xs font-semibold shrink-0">
                            Adicionar
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {categoriasDisponiveis.map((categoria) => {
                            const active = form.categoriasIds.includes(categoria.id);
                            return (
                              <div key={categoria.id} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all text-xs font-medium', active ? 'border-[#d48997]/30 bg-[#d48997]/5 text-[#d48997]' : 'border-black/[0.04] dark:border-white/10 bg-white/40 dark:bg-white/5 text-gray-600 dark:text-white/60')}>
                                <button type="button" onClick={() => toggleCategoria(categoria.id)} className="normal-case font-medium">
                                  {categoria.nome}
                                </button>
                                {!isScopedProfessional && (
                                  <button type="button" onClick={() => removeCategoria(categoria.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {categoriasDisponiveis.length === 0 && <span className="text-xs text-gray-400">Nenhuma categoria criada ainda.</span>}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm flex flex-col justify-center">
                        <ImageUpload
                          label="Foto de Perfil"
                          value={form.fotoUrl}
                          onChange={(value) => setForm((prev) => ({ ...prev, fotoUrl: value }))}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                      <NumberField label="Comissão Padrão (%)" value={form.comissaoPercent} onChange={(value) => setForm((prev) => ({ ...prev, comissaoPercent: Number(value || 0) }))} icon={<Percent size={13} />} />
                      <NumberField label="Meta Mensal (R$)" value={form.metaMensal} onChange={(value) => setForm((prev) => ({ ...prev, metaMensal: Number(value || 0) }))} icon={<TrendingUp size={13} />} />
                      <NumberField label="Bônus Meta Fixo (R$)" value={form.bonusMetaValor} onChange={(value) => setForm((prev) => ({ ...prev, bonusMetaValor: Number(value || 0) }))} icon={<DollarSign size={13} />} />
                    </div>
                  </div>
                )}

                {activeTab === 'contato' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="E-mail principal" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} icon={<Mail size={13} />} />
                    <Field label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} icon={<Phone size={13} />} />
                    <Field label="CPF" value={form.cpf} onChange={(value) => setForm((prev) => ({ ...prev, cpf: value }))} icon={<FileText size={13} />} />
                    <Field label="RG" value={form.rg} onChange={(value) => setForm((prev) => ({ ...prev, rg: value }))} icon={<FileText size={13} />} />
                    <Field label="Data de nascimento" type="date" value={form.dataNascimento} onChange={(value) => setForm((prev) => ({ ...prev, dataNascimento: value }))} icon={<Calendar size={13} />} />
                  </div>
                )}

                {activeTab === 'endereco' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <Field label="Endereço / Logradouro" value={form.endereco} onChange={(value) => setForm((prev) => ({ ...prev, endereco: value }))} icon={<MapPin size={13} />} />
                      </div>
                      <Field label="Número" value={form.numero} onChange={(value) => setForm((prev) => ({ ...prev, numero: value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Bairro" value={form.bairro} onChange={(value) => setForm((prev) => ({ ...prev, bairro: value }))} />
                      <Field label="Complemento (apto, sala)" value={form.complemento} onChange={(value) => setForm((prev) => ({ ...prev, complemento: value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="CEP" value={form.cep} onChange={(value) => setForm((prev) => ({ ...prev, cep: value }))} />
                      <Field label="Cidade" value={form.cidade} onChange={(value) => setForm((prev) => ({ ...prev, cidade: value }))} />
                      <Field label="Estado (UF)" value={form.estado} onChange={(value) => setForm((prev) => ({ ...prev, estado: value }))} />
                    </div>
                  </div>
                )}

                {activeTab === 'servicos' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#d48997]">Catálogo de Especialidades</p>
                        <h3 className="mt-1.5 text-lg font-serif font-normal text-gray-905 dark:text-white">Serviços e Comissões</h3>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 font-normal">Libere serviços inteiros marcando as categorias de serviços correspondentes.</p>
                      </div>
                      <div className="rounded-full bg-[#d48997]/10 px-4 py-1.5 text-[10px] font-semibold text-[#d48997] shrink-0 border border-[#d48997]/20">
                        {servicosVinculadosNoFormulario.length} ativos
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Categorias de Serviços Relacionados</p>
                      <div className="flex flex-wrap gap-2.5">
                        {categoriasServicosDisponiveis.map((categoria) => {
                          const active = form.servicoCategoriasIds.includes(categoria.id);
                          return (
                            <button
                              key={categoria.id}
                              type="button"
                              onClick={() => toggleCategoriaServico(categoria.id)}
                              className={cn(
                                'rounded-xl border px-4 py-2.5 text-left transition-all text-xs font-semibold',
                                active
                                  ? 'border-[#d48997]/30 bg-[#d48997]/5 text-[#d48997] shadow-sm'
                                  : 'border-black/[0.04] bg-gray-50/50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/70'
                              )}
                            >
                              <p className="normal-case font-medium">{categoria.nome}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                                {(categoria.servicos || []).length} serviços
                              </p>
                            </button>
                          );
                        })}
                        {categoriasServicosDisponiveis.length === 0 && (
                          <span className="text-xs text-gray-400">Nenhuma categoria de serviços encontrada.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm space-y-3.5">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Serviços Vinculados Individualmente</p>
                      <div className="grid gap-3">
                        {servicosDisponiveis.map((servico) => {
                          const selected = form.servicos.find((item) => item.id === servico.id);
                          const inherited = servicoIdsPorCategoriaSelecionada.has(servico.id);
                          return (
                            <div key={servico.id} className={cn('rounded-xl border p-4.5 transition-all bg-white dark:bg-white/[0.02]', selected || inherited ? 'border-[#d48997]/25 shadow-sm' : 'border-black/[0.04] dark:border-white/[0.05]')}>
                              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <label className={cn('flex items-center gap-3', inherited && !selected ? 'cursor-default' : 'cursor-pointer')}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selected || inherited)}
                                    disabled={inherited && !selected}
                                    onChange={() => toggleServico(servico.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-[#d48997] focus:ring-[#d48997]/50 disabled:opacity-50"
                                  />
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white normal-case">{servico.nome}</p>
                                      {inherited && (
                                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                          Herdado da categoria
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                                      {Number(servico.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                  </div>
                                </label>

                                {selected && (
                                  <div className="grid gap-3 grid-cols-2">
                                    <NumberField compact label="Repasse (%)" value={selected.comissaoPercent ?? ''} onChange={(value) => updateServicoComissao(servico.id, 'comissaoPercent', value)} icon={<Percent size={12} />} />
                                    <NumberField compact label="Fixo (R$)" value={selected.comissaoValor ?? ''} onChange={(value) => updateServicoComissao(servico.id, 'comissaoValor', value)} icon={<DollarSign size={12} />} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'banco' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nome da Instituição Bancária" value={form.banco} onChange={(value) => setForm((prev) => ({ ...prev, banco: value }))} icon={<CreditCard size={13} />} />
                      <Field label="Código da Agência" value={form.agencia} onChange={(value) => setForm((prev) => ({ ...prev, agency: value }))} />
                      <Field label="Número da Conta Bancária" value={form.conta} onChange={(value) => setForm((prev) => ({ ...prev, conta: value }))} />
                      <Field label="Chave PIX principal" value={form.pix} onChange={(value) => setForm((prev) => ({ ...prev, pix: value }))} icon={<DollarSign size={13} />} />
                    </div>

                    <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                      <p className="text-xs font-semibold text-[#d48997]">Repasse Automatizado</p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-normal">
                        Estas informações são utilizadas pelo financeiro do salão para consolidar relatórios de comissionamento e repasses mensais/quinzenais.
                      </p>
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-black/[0.04] bg-white/95 pt-4 backdrop-blur dark:border-white/5 dark:bg-[#0c0c0e]/95 md:flex-row justify-end">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-black/[0.04] bg-gray-50 hover:bg-gray-105 dark:bg-white/5 px-6 py-2.5 text-xs font-semibold text-gray-500 dark:text-white/70">
                    Descartar alterações
                  </button>
                  <button type="submit" disabled={saving} className="rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-6 py-2.5 text-xs font-semibold shadow-sm transition">
                    {saving ? 'Gravando...' : editingId ? 'Salvar Configurações' : 'Criar Profissional'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {actionMenuModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/[0.03]">
              <h3 className="text-lg font-serif font-normal text-gray-905 dark:text-white">Opções Gerais</h3>
              <button onClick={() => setActionMenuModal(null)} className="rounded-xl border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm z-10 bg-white dark:bg-[#0c0c0e]">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              <button onClick={() => { openEdit(actionMenuModal, 'geral'); setActionMenuModal(null); }} className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white dark:bg-white/[0.01] p-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5">
                <User size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-905 dark:text-white">Perfil e Configurações</p>
                  <p className="text-[10px] text-gray-405 dark:text-gray-500">Nome, biografia, foto e comissão padrão</p>
                </div>
              </button>
              
              <button onClick={() => { openEdit(actionMenuModal, 'servicos'); setActionMenuModal(null); }} className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white dark:bg-white/[0.01] p-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5">
                <Scissors size={16} className="text-[#d48997]" />
                <div>
                  <p className="text-sm font-semibold text-gray-905 dark:text-white">Serviços Habilitados</p>
                  <p className="text-[10px] text-gray-455 dark:text-gray-500">Ajustes manuais de comissões por serviço</p>
                </div>
              </button>

              <button onClick={() => { openEdit(actionMenuModal, 'banco'); setActionMenuModal(null); }} className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white dark:bg-white/[0.01] p-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/5">
                <CreditCard size={16} className="text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-905 dark:text-white">Dados Financeiros</p>
                  <p className="text-[10px] text-gray-455 dark:text-gray-500">Banco, PIX e informações cadastrais</p>
                </div>
              </button>

              {!isScopedProfessional && (
                <button onClick={() => { handleDelete(actionMenuModal.id); setActionMenuModal(null); }} className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center transition hover:bg-red-500/10">
                  <Trash2 size={15} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-500">Excluir Profissional</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {scheduleModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-black/[0.04] bg-white dark:bg-[#0c0c0e] dark:border-white/10">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.03] px-5 py-4 dark:border-white/5">
              <div>
                <p className="text-[10px] font-semibold text-[#d48997]">Definição de Horários</p>
                <h3 className="mt-1 font-serif font-normal text-xl sm:text-2xl text-gray-905 dark:text-white">{scheduleModal.nome}</h3>
              </div>
              <button onClick={() => setScheduleModal(null)} className="rounded-xl border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm z-10 bg-white dark:bg-[#0c0c0e]">
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 custom-scrollbar">
              {DIAS.map((dia, index) => {
                const horario = horarios.find((item) => item.diaSemana === index);
                return (
                  <div key={dia} className={cn('rounded-2xl border p-4 bg-white/60 dark:bg-white/[0.02]', horario ? 'border-emerald-500/25 bg-emerald-500/[0.01]' : 'border-black/[0.04] dark:border-white/[0.04]')}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-909 dark:text-white cursor-pointer select-none">
                        <input type="checkbox" checked={Boolean(horario)} onChange={() => toggleDia(index)} className="h-4 w-4 rounded border-gray-300 text-[#d48997] focus:ring-[#d48997]/50" />
                        <span>{dia}</span>
                      </label>

                      {horario && (
                        <div className="grid gap-3.5 grid-cols-3">
                          <CompactInput type="time" label="Entrada" value={horario.inicioHora} onChange={(value) => updateHorario(index, 'inicioHora', value)} />
                          <CompactInput type="time" label="Saída" value={horario.fimHora} onChange={(value) => updateHorario(index, 'fimHora', value)} />
                          <div>
                            <label className="mb-1.5 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Intervalo</label>
                            <select value={horario.intervaloMin} onChange={(event) => updateHorario(index, 'intervaloMin', Number(event.target.value))} className="w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3.5 py-2.5 text-xs font-medium text-gray-950 dark:text-white outline-none focus:border-[#d48997]">
                              <option value={15}>15 min</option>
                              <option value={30}>30 min</option>
                              <option value={60}>60 min</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-0 flex shrink-0 flex-col gap-3 border-t border-black/[0.04] bg-white/95 p-4 backdrop-blur dark:border-white/5 dark:bg-[#0c0c0e]/95 md:flex-row justify-end">
              <button onClick={() => setScheduleModal(null)} className="rounded-xl border border-black/[0.04] bg-gray-50 hover:bg-gray-105 dark:bg-white/5 px-6 py-2.5 text-xs font-semibold text-gray-500 dark:text-white/70">
                Cancelar
              </button>
              <button onClick={saveSchedules} disabled={saving} className="rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-6 py-2.5 text-xs font-semibold shadow-sm transition">
                {saving ? 'Gravando...' : 'Salvar Escala'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MiniMetric({ label, value, highlight = false }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 normal-case">{label}</p>
      <p className={cn('mt-0.5 text-lg font-semibold', highlight ? 'text-[#d48997]' : 'text-gray-909 dark:text-white')}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', icon, required = false }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{label} {required && <span className="text-rose-500">*</span>}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className={cn('w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 py-2.5 text-sm text-gray-950 outline-none placeholder:text-gray-400 focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all', icon && 'pl-11')}
        />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, icon, compact = false }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn('w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 py-2.5 text-sm text-gray-950 outline-none placeholder:text-gray-400 focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all', icon && 'pl-11', compact && 'py-2')}
        />
      </div>
    </div>
  );
}

function CompactInput({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-950 dark:text-white outline-none focus:border-[#d48997] dark:bg-[#111113] transition-all"
      />
    </div>
  );
}
