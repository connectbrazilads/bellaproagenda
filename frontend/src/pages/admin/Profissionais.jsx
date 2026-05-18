import { useEffect, useMemo, useState } from 'react';
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

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const TABS = [
  { id: 'geral', label: 'Geral', icon: User },
  { id: 'contato', label: 'Contato', icon: Mail },
  { id: 'endereco', label: 'Endereco', icon: MapPin },
  { id: 'servicos', label: 'Servicos', icon: Scissors },
  { id: 'banco', label: 'Banco e Pix', icon: CreditCard },
];

const EMPTY_FORM = {
  nome: '',
  bio: '',
  fotoUrl: '',
  servicos: [],
  categoriasIds: [],
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
  const role = localStorage.getItem('salao_user_role');
  const myProfissionalId = localStorage.getItem('salao_user_pid') || '';
  const isScopedProfessional = role === 'profissional' && Boolean(myProfissionalId);

  const [profissionais, setProfissionais] = useState([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState([]);
  const [salaoInfo, setSalaoInfo] = useState(null);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [horarios, setHorarios] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [profissionaisResponse, servicosResponse, categoriasResponse, salaoResponse] = await Promise.all([
      getProfissionais(),
      getServicos(),
      getCategoriasProfissionais(),
      getAdminSalao(),
    ]);

    setProfissionais(profissionaisResponse.data || []);
    setServicosDisponiveis(servicosResponse.data || []);
    setCategoriasDisponiveis(categoriasResponse.data || []);
    setSalaoInfo(salaoResponse.data || null);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setActiveTab('geral');
    setModalOpen(true);
  }

  function openEdit(profissional) {
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
    setActiveTab('geral');
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

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col gap-5 border-b border-gray-200 dark:border-white/5 pb-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-[#e29ba8]" />
          <p className="brand-kicker">Curadoria da equipe</p>
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl sm:text-5xl font-brand-display text-gray-900 dark:text-white leading-none">
              Elite <span className="brand-text-gradient">Squad</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-gray-600 dark:text-white/60">
              Organize os talentos que sustentam a experiência do salão com um cadastro claro, bonito e pronto para operar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="hidden rounded-[1.8rem] border border-gray-200 dark:border-white/5 bg-white/[0.03] px-6 py-4 xl:flex items-center gap-4 sm:p-6">
              <MiniMetric label="Ativos" value={visibleProfessionals.filter((item) => item.ativo).length} />
              <MiniMetric label="Serviços" value={servicosDisponiveis.length} highlight />
            </div>

            {!isScopedProfessional && (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={openCreate}
                  disabled={salaoInfo && profissionais.length >= salaoInfo.maxProfissionais}
                  className="inline-flex items-center gap-3 rounded-[1.6rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white shadow-[0_24px_60px_-30px_rgba(222,151,165,0.95)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  Novo profissional
                </button>
                {salaoInfo && profissionais.length >= salaoInfo.maxProfissionais && (
                  <p className="text-xs text-[#efbac2]">
                    Limite de {salaoInfo.maxProfissionais} atingido. Contate o suporte para upgrade.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visibleProfessionals.map((profissional) => (
            <motion.article
              key={profissional.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] p-4 sm:p-6 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="relative">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-[1.4rem] sm:rounded-[1.7rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]">
                    {profissional.fotoUrl ? (
                      <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-gray-400 dark:text-white/24">
                        {profissional.nome?.[0] || 'P'}
                      </div>
                    )}
                  </div>
                  <span className={`absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#2b2129] ${profissional.ativo ? 'bg-emerald-400' : 'bg-white/18'}`}>
                    <Activity size={12} className="text-gray-900 dark:text-white" />
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={() => openEdit(profissional)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-gray-900 dark:text-white">
                    <Edit3 size={16} />
                  </button>
                  {!isScopedProfessional && (
                    <button onClick={() => handleDelete(profissional.id)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-red-200">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 sm:mt-5">
                <h2 className="text-2xl sm:text-3xl font-brand-display text-gray-900 dark:text-white">{profissional.nome}</h2>
                <div className="mt-2 flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={10} className="fill-[#efb45e] text-[#efb45e]" />
                    ))}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#efbac2]">Especialista BellaPro</span>
                </div>
                {profissional.bio && (
                  <p className="mt-4 line-clamp-3 text-sm italic leading-relaxed text-gray-200 dark:text-white/58">"{profissional.bio}"</p>
                )}
              </div>

              <div className="mt-4 sm:mt-6 rounded-[1.5rem] sm:rounded-[1.7rem] border border-gray-200 dark:border-white/5 bg-black/14 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#e29ba8]/12 text-[#efbac2]">
                      <Tag size={15} />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/44">Categorias</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#efbac2]">
                    {(profissional.categorias || []).length}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(profissional.categorias || []).slice(0, 3).map((item) => (
                    <span key={item.categoriaId} className="rounded-full border border-gray-200 dark:border-white/5 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 dark:text-white/64">
                      {item.categoria?.nome}
                    </span>
                  ))}
                  {(!profissional.categorias || profissional.categorias.length === 0) && (
                    <span className="text-xs text-gray-500 dark:text-white/40">Sem categorias definidas</span>
                  )}
                </div>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-3">
                <button onClick={() => openSchedules(profissional)} className="rounded-xl sm:rounded-[1.3rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-3 py-3 sm:px-4 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em]">
                  <span className="inline-flex items-center gap-2">
                    <Calendar size={14} />
                    Escala
                  </span>
                </button>
                <div className="rounded-xl sm:rounded-[1.3rem] border border-gray-200 dark:border-white/5 bg-white/[0.04] px-3 py-3 sm:px-4 sm:py-4 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.22em] text-gray-600 dark:text-white/74 flex items-center justify-center">
                  Produção
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/82 p-3 backdrop-blur-md sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2.6rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] lg:flex-row">
            <aside className="w-full border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a] p-4 sm:p-6 lg:w-80 lg:border-b-0 lg:border-r">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[#e29ba8] text-[#1a1a1f]">
                    <User size={22} />
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-brand-display text-gray-900 dark:text-white">{editingId ? 'Editar' : 'Novo'} perfil</h2>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
                    Carreira, agenda e cadastro profissional
                  </p>
                </div>
                <button onClick={() => setModalOpen(false)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-600 dark:text-white/60 transition hover:text-gray-900 dark:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex min-w-[170px] items-center gap-3 rounded-[1.4rem] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] transition lg:w-full',
                        active
                          ? 'bg-[#de97a5] text-white shadow-[0_20px_50px_-28px_rgba(222,151,165,0.9)]'
                          : 'bg-transparent text-gray-200 dark:text-white/54 hover:bg-white/[0.05] hover:text-white/78'
                      )}
                    >
                      <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', active ? 'bg-white/18' : 'bg-white/[0.06]')}>
                        <Icon size={14} />
                      </span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {activeTab === 'geral' && (
                  <div className="space-y-8">
                    <div className="grid gap-4 sm:p-6 md:grid-cols-2">
                      <Field label="Nome artístico ou completo" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
                      <Field label="Biografia ou especialidade" value={form.bio} onChange={(value) => setForm((prev) => ({ ...prev, bio: value }))} />
                    </div>

                    <div className="grid gap-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] p-4 sm:p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#efbac2]">Categorias profissionais</p>
                        <h3 className="mt-3 text-3xl font-brand-display text-gray-900 dark:text-white">Defina como esta pessoa aparece no salão</h3>
                        <p className="mt-3 text-sm text-gray-200 dark:text-white/56">
                          Exemplos: cabeleireiro, manicure, barbeiro, esteticista ou designer de sobrancelhas.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 md:flex-row">
                          <input
                            value={novaCategoria}
                            onChange={(event) => setNovaCategoria(event.target.value)}
                            placeholder="Criar nova categoria do salão"
                            className="flex-1 rounded-[1.2rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28"
                          />
                          <button type="button" onClick={addCategoria} className="rounded-[1.2rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                            Adicionar categoria
                          </button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {categoriasDisponiveis.map((categoria) => {
                            const active = form.categoriasIds.includes(categoria.id);
                            return (
                              <div key={categoria.id} className={cn('flex items-center gap-2 rounded-full border px-3 py-2', active ? 'border-[#e29ba8]/32 bg-[#e29ba8]/10' : 'border-gray-200 dark:border-white/5 bg-white/[0.04]')}>
                                <button type="button" onClick={() => toggleCategoria(categoria.id)} className={cn('text-[10px] font-black uppercase tracking-[0.16em]', active ? 'text-[#f4c3cb]' : 'text-gray-600 dark:text-white/60')}>
                                  {categoria.nome}
                                </button>
                                {!isScopedProfessional && (
                                  <button type="button" onClick={() => removeCategoria(categoria.id)} className="text-white/34 transition hover:text-red-200">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {categoriasDisponiveis.length === 0 && <span className="text-sm text-white/38">Nenhuma categoria criada ainda.</span>}
                        </div>
                      </div>

                      <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-black/14 p-4 sm:p-6">
                        <ImageUpload
                          label="Retrato profissional"
                          value={form.fotoUrl}
                          onChange={(value) => setForm((prev) => ({ ...prev, fotoUrl: value }))}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:p-6 md:grid-cols-3 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-black/14 p-4 sm:p-6">
                      <NumberField label="Comissao padrao (%)" value={form.comissaoPercent} onChange={(value) => setForm((prev) => ({ ...prev, comissaoPercent: Number(value || 0) }))} icon={<Percent size={14} />} />
                      <NumberField label="Meta mensal (R$)" value={form.metaMensal} onChange={(value) => setForm((prev) => ({ ...prev, metaMensal: Number(value || 0) }))} icon={<TrendingUp size={14} />} />
                      <NumberField label="Bonus fixo (R$)" value={form.bonusMetaValor} onChange={(value) => setForm((prev) => ({ ...prev, bonusMetaValor: Number(value || 0) }))} icon={<DollarSign size={14} />} />
                    </div>
                  </div>
                )}

                {activeTab === 'contato' && (
                  <div className="grid gap-4 sm:p-6 md:grid-cols-2">
                    <Field label="E-mail" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} icon={<Mail size={14} />} />
                    <Field label="Telefone ou WhatsApp" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} icon={<Phone size={14} />} />
                    <Field label="CPF" value={form.cpf} onChange={(value) => setForm((prev) => ({ ...prev, cpf: value }))} icon={<FileText size={14} />} />
                    <Field label="RG" value={form.rg} onChange={(value) => setForm((prev) => ({ ...prev, rg: value }))} icon={<FileText size={14} />} />
                    <Field label="Data de nascimento" type="date" value={form.dataNascimento} onChange={(value) => setForm((prev) => ({ ...prev, dataNascimento: value }))} icon={<Calendar size={14} />} />
                  </div>
                )}

                {activeTab === 'endereco' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:p-6 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <Field label="Logradouro" value={form.endereco} onChange={(value) => setForm((prev) => ({ ...prev, endereco: value }))} icon={<MapPin size={14} />} />
                      </div>
                      <Field label="Numero" value={form.numero} onChange={(value) => setForm((prev) => ({ ...prev, numero: value }))} />
                    </div>
                    <div className="grid gap-4 sm:p-6 md:grid-cols-2">
                      <Field label="Bairro" value={form.bairro} onChange={(value) => setForm((prev) => ({ ...prev, bairro: value }))} />
                      <Field label="Complemento" value={form.complemento} onChange={(value) => setForm((prev) => ({ ...prev, complemento: value }))} />
                    </div>
                    <div className="grid gap-4 sm:p-6 md:grid-cols-3">
                      <Field label="CEP" value={form.cep} onChange={(value) => setForm((prev) => ({ ...prev, cep: value }))} />
                      <Field label="Cidade" value={form.cidade} onChange={(value) => setForm((prev) => ({ ...prev, cidade: value }))} />
                      <Field label="Estado" value={form.estado} onChange={(value) => setForm((prev) => ({ ...prev, estado: value }))} />
                    </div>
                  </div>
                )}

                {activeTab === 'servicos' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-black/14 p-4 sm:p-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#efbac2]">Menu de especialidades</p>
                        <h3 className="mt-2 text-3xl font-brand-display text-gray-900 dark:text-white">Serviços e comissões</h3>
                        <p className="mt-2 text-sm text-gray-200 dark:text-white/56">Escolha os serviços que esta pessoa executa e ajuste regras específicas quando precisar.</p>
                      </div>
                      <div className="rounded-full bg-[#e29ba8]/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#f2c1c9]">
                        {form.servicos.length} servicos vinculados
                      </div>
                    </div>

                    <div className="space-y-4">
                      {servicosDisponiveis.map((servico) => {
                        const selected = form.servicos.find((item) => item.id === servico.id);
                        return (
                          <div key={servico.id} className={cn('rounded-[2rem] border p-5 transition', selected ? 'border-[#e29ba8]/34 bg-[#e29ba8]/08' : 'border-gray-200 dark:border-white/5 bg-white/[0.03]')}>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <label className="flex cursor-pointer items-center gap-4">
                                <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleServico(servico.id)} className="h-4 w-4 accent-[#de97a5]" />
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{servico.nome}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-white/44">
                                    {Number(servico.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                              </label>

                              {selected && (
                                <div className="grid gap-3 md:grid-cols-2">
                                  <NumberField compact label="Comissao (%)" value={selected.comissaoPercent ?? ''} onChange={(value) => updateServicoComissao(servico.id, 'comissaoPercent', value)} icon={<Percent size={13} />} />
                                  <NumberField compact label="Valor fixo (R$)" value={selected.comissaoValor ?? ''} onChange={(value) => updateServicoComissao(servico.id, 'comissaoValor', value)} icon={<DollarSign size={13} />} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'banco' && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:p-6 md:grid-cols-2">
                      <Field label="Banco" value={form.banco} onChange={(value) => setForm((prev) => ({ ...prev, banco: value }))} icon={<CreditCard size={14} />} />
                      <Field label="Agencia" value={form.agencia} onChange={(value) => setForm((prev) => ({ ...prev, agencia: value }))} />
                      <Field label="Conta" value={form.conta} onChange={(value) => setForm((prev) => ({ ...prev, conta: value }))} />
                      <Field label="Chave Pix" value={form.pix} onChange={(value) => setForm((prev) => ({ ...prev, pix: value }))} icon={<DollarSign size={14} />} />
                    </div>

                    <div className="rounded-[2rem] border border-[#e29ba8]/12 bg-[#e29ba8]/06 p-4 sm:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#efbac2]">Repasse organizado</p>
                      <p className="mt-3 text-sm leading-relaxed text-white/62">
                        Esses dados ajudam no controle de comissões e deixam a rotina financeira mais segura na hora do pagamento da equipe.
                      </p>
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-gray-200 bg-white/95 pt-6 backdrop-blur dark:border-white/5 dark:bg-[#1a171f]/95 md:flex-row">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-[1.4rem] border border-gray-200 dark:border-white/5 bg-white/[0.04] px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/66">
                    Descartar alteracoes
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 rounded-[1.5rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white shadow-[0_24px_60px_-30px_rgba(222,151,165,0.95)]">
                    {saving ? 'Salvando...' : editingId ? 'Salvar perfil' : 'Criar perfil'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {scheduleModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/82 p-3 backdrop-blur-md sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]">
            <div className="mb-0 flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-white/5 sm:px-6 sm:py-6 md:px-8">
              <div>
                <p className="brand-kicker">Escala semanal</p>
                <h3 className="mt-2 text-3xl font-brand-display text-gray-900 dark:text-white">{scheduleModal.nome}</h3>
              </div>
              <button onClick={() => setScheduleModal(null)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-600 dark:text-white/60 transition hover:text-gray-900 dark:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4 custom-scrollbar sm:px-6 sm:pb-6 sm:pt-6 md:px-8 md:pb-8">
              {DIAS.map((dia, index) => {
                const horario = horarios.find((item) => item.diaSemana === index);
                return (
                  <div key={dia} className={cn('rounded-[1.8rem] border p-4', horario ? 'border-emerald-300/18 bg-emerald-400/08' : 'border-gray-200 dark:border-white/5 bg-white/[0.03]')}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <label className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                        <input type="checkbox" checked={Boolean(horario)} onChange={() => toggleDia(index)} className="h-4 w-4 accent-[#de97a5]" />
                        {dia}
                      </label>

                      {horario && (
                        <div className="grid gap-3 md:grid-cols-3">
                          <CompactInput type="time" label="Entrada" value={horario.inicioHora} onChange={(value) => updateHorario(index, 'inicioHora', value)} />
                          <CompactInput type="time" label="Saida" value={horario.fimHora} onChange={(value) => updateHorario(index, 'fimHora', value)} />
                          <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">Intervalo</label>
                            <select value={horario.intervaloMin} onChange={(event) => updateHorario(index, 'intervaloMin', Number(event.target.value))} className="w-full rounded-[1rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28">
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

            <div className="sticky bottom-0 mt-0 flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-white/5 dark:bg-[#1a171f]/95 sm:px-6 md:flex-row md:px-8">
              <button onClick={() => setScheduleModal(null)} className="rounded-[1.4rem] border border-gray-200 dark:border-white/5 bg-white/[0.04] px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/66">
                Cancelar
              </button>
              <button onClick={saveSchedules} disabled={saving} className="flex-1 rounded-[1.5rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                {saving ? 'Salvando...' : 'Salvar horarios'}
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
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold', highlight ? 'text-[#efbac2]' : 'text-gray-900 dark:text-white')}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', icon, required = false }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/28">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className={cn('w-full rounded-[1.25rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28', icon && 'pl-12')}
        />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, icon, compact = false }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/28">{icon}</span>}
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn('w-full rounded-[1.25rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#e29ba8]/28', icon && 'pl-12', compact && 'py-2.5')}
        />
      </div>
    </div>
  );
}

function CompactInput({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28"
      />
    </div>
  );
}
