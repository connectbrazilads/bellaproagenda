import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, Clock, DollarSign, Droplets, Edit3, Package, Plus, Scissors, Search, Tag, Trash2, TrendingUp } from 'lucide-react';
import {
  createCategoriaServico,
  createServico,
  deleteCategoriaServico,
  deleteServico,
  getCategoriasServicos,
  getProdutos,
  getServicos,
  updateServico,
} from '../../services/api';
import { cn, formatDurationLabel } from '../../lib/utils';
import useElementWidth from '../../hooks/useElementWidth';

const EMPTY = {
  nome: '',
  descricao: '',
  categoriaId: '',
  duracaoMin: 60,
  preco: '',
  custoProduto: 0,
  ativo: true,
  consumosProdutos: [],
};

export default function Servicos() {
  const pageRef = useRef(null);
  const [servicos, setServicos] = useState([]);
  const [categoriasServicos, setCategoriasServicos] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [novaCategoriaServico, setNovaCategoriaServico] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const pageWidth = useElementWidth(pageRef, typeof window !== 'undefined' ? window.innerWidth : 1440);
  const isCompactPage = pageWidth < 1340;
  const showThreeCards = pageWidth >= 1500;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [servicosResponse, produtosResponse, categoriasResponse] = await Promise.all([
      getServicos(),
      getProdutos(),
      getCategoriasServicos(),
    ]);
    setServicos(servicosResponse.data || []);
    setProdutosDisponiveis(produtosResponse.data || []);
    setCategoriasServicos(categoriasResponse.data || []);
  }

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(servico) {
    setForm({
      nome: servico.nome || '',
      descricao: servico.descricao || '',
      categoriaId: servico.categoriaId || '',
      duracaoMin: servico.duracaoMin || 60,
      preco: servico.preco || '',
      custoProduto: servico.custoProduto || 0,
      ativo: servico.ativo !== false,
      consumosProdutos: (servico.consumos || []).map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
      })),
    });
    setEditingId(servico.id);
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        categoriaId: form.categoriaId || null,
        duracaoMin: Number(form.duracaoMin),
        preco: Number(form.preco),
        custoProduto: Number(form.custoProduto),
        consumosProdutos: (form.consumosProdutos || []).filter((item) => item.produtoId && Number(item.quantidade) > 0),
      };

      if (editingId) {
        await updateServico(editingId, payload);
      } else {
        await createServico(payload);
      }

      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Deseja excluir este servico?')) return;
    await deleteServico(id);
    await loadData();
  }

  async function handleCreateCategoriaServico() {
    const nome = novaCategoriaServico.trim();
    if (!nome) return;
    const response = await createCategoriaServico({ nome });
    const categoria = response.data;
    setCategoriasServicos((prev) => [...prev, categoria].sort((a, b) => a.nome.localeCompare(b.nome)));
    setForm((prev) => ({ ...prev, categoriaId: categoria.id }));
    setNovaCategoriaServico('');
  }

  async function handleDeleteCategoriaServico(categoriaId) {
    if (!window.confirm('Deseja excluir esta categoria de servicos? Os servicos continuam existindo, apenas ficam sem categoria.')) return;
    await deleteCategoriaServico(categoriaId);
    setCategoriasServicos((prev) => prev.filter((categoria) => categoria.id !== categoriaId));
    setServicos((prev) =>
      prev.map((servico) => (servico.categoriaId === categoriaId ? { ...servico, categoriaId: null, categoria: null } : servico))
    );
    setForm((prev) => ({
      ...prev,
      categoriaId: prev.categoriaId === categoriaId ? '' : prev.categoriaId,
    }));
    await loadData();
  }

  function toggleProduto(produtoId) {
    const exists = form.consumosProdutos.find((item) => item.produtoId === produtoId);
    if (exists) {
      setForm((prev) => ({
        ...prev,
        consumosProdutos: prev.consumosProdutos.filter((item) => item.produtoId !== produtoId),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      consumosProdutos: [...prev.consumosProdutos, { produtoId, quantidade: 1 }],
    }));
  }

  function updateConsumo(produtoId, quantidade) {
    setForm((prev) => ({
      ...prev,
      consumosProdutos: prev.consumosProdutos.map((item) =>
        item.produtoId === produtoId ? { ...item, quantidade: Number(quantidade || 1) } : item
      ),
    }));
  }

  const horas = Math.floor(Number(form.duracaoMin || 0) / 60);
  const minutos = Number(form.duracaoMin || 0) % 60;

  function updateDuration(nextHoras, nextMinutos) {
    setForm((prev) => ({ ...prev, duracaoMin: Number(nextHoras) * 60 + Number(nextMinutos) }));
  }

  const filteredServicos = servicos.filter((servico) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      servico.nome?.toLowerCase().includes(term) ||
      servico.descricao?.toLowerCase().includes(term) ||
      servico.categoria?.nome?.toLowerCase().includes(term)
    );
  });

  return (
    <motion.div ref={pageRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 lg:space-y-10 pb-20">
      <header className={cn('flex flex-col gap-5 border-b border-slate-200/50 dark:border-white/5 pb-8', !isCompactPage && 'md:flex-row md:items-end md:justify-between')}>
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#e29ba8]" />
            <p className="brand-kicker text-[#efbac2]">Portfolio de servicos</p>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-brand-display text-gray-900 dark:text-white leading-none">
            Catalogo <span className="brand-text-gradient">BellaPro</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-400 dark:text-white/58">
            Estruture o menu do salao com preco, duracao, margem e baixa automatica de estoque.
          </p>
        </div>

        <button onClick={openCreate} className="inline-flex items-center justify-center gap-3 rounded-[1.5rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-slate-950 px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] shadow-[0_16px_35px_-12px_rgba(222,151,165,0.65)] hover:shadow-[0_20px_45px_-12px_rgba(222,151,165,0.85)] transition-all duration-300 hover:scale-[1.02]">
          <Plus size={16} strokeWidth={2.5} />
          Novo servico
        </button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar servicos..."
            className="w-full rounded-[1.35rem] border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.04] px-5 py-4 pl-12 text-sm font-semibold text-gray-900 dark:text-white outline-none transition placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-[#e29ba8]/32 focus:bg-white/60 dark:focus:bg-white/[0.06] premium-focus-input"
          />
        </div>

        <div className="rounded-[2rem] border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-[#18161d]/35 p-5 shadow-[0_20px_45px_-28px_rgba(140,107,117,0.12)]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#e29ba8]/20 bg-[#e29ba8]/10 text-[#d48997]">
              <Tag size={16} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#efbac2]">Categorias de servicos</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-white/56">
                Agrupe cabelo, barbeiro, manicure e outras frentes para liberar tudo de uma vez no cadastro do profissional.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={novaCategoriaServico}
              onChange={(event) => setNovaCategoriaServico(event.target.value)}
              placeholder="Ex.: Cabeleireiro"
              className="flex-1 rounded-[1.2rem] border border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-[#e29ba8]/32 premium-focus-input"
            />
            <button
              type="button"
              onClick={handleCreateCategoriaServico}
              className="rounded-[1.2rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_16px_35px_-18px_rgba(222,151,165,0.7)]"
            >
              Criar categoria
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoriasServicos.map((categoria) => (
              <div
                key={categoria.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.05] px-3 py-2"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 dark:text-white/64">
                  {categoria.nome} ({(categoria.servicos || []).length})
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategoriaServico(categoria.id)}
                  className="text-gray-400 transition hover:text-red-500 dark:text-white/34 dark:hover:text-red-200"
                  aria-label={`Excluir categoria ${categoria.nome}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {categoriasServicos.length === 0 && (
              <span className="text-sm text-gray-400 dark:text-white/38">Nenhuma categoria criada ainda.</span>
            )}
          </div>
        </div>
      </div>

      <div className={cn('grid gap-6 sm:p-0 md:grid-cols-2', showThreeCards && 'xl:grid-cols-3')}>
        <AnimatePresence>
          {filteredServicos.map((servico) => (
            <motion.article
              key={servico.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-[2.2rem] border border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-[#18161d]/30 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_20px_45px_-28px_rgba(140,107,117,0.12)] hover:border-[#e29ba8]/20 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#e29ba8]/10 text-[#d48997] border border-[#e29ba8]/20 transition-all group-hover:rotate-6">
                  <Scissors size={24} strokeWidth={2.5} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(servico)} className="rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08]">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(servico.id)} className="rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-brand-display text-gray-900 dark:text-white leading-none">{servico.nome}</h2>
                  {!servico.ativo && (
                    <span className="rounded-full border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 dark:text-white/54">
                      Inativo
                    </span>
                  )}
                  {servico.categoria?.nome && (
                    <span className="rounded-full border border-[#e29ba8]/20 bg-[#e29ba8]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#d48997]">
                      {servico.categoria.nome}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-400 dark:text-white/56 min-h-[40px]">
                  {servico.descricao || 'Servico ainda sem descricao detalhada.'}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <InfoPill icon={<Clock size={15} />} label="Duracao" value={formatDurationLabel(servico.duracaoMin)} />
                <InfoPill
                  icon={<DollarSign size={15} />}
                  label="Preco"
                  value={Number(servico.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  tone="emerald"
                />
              </div>

              {(servico.consumos || []).length > 0 && (
                <div className="mt-6 rounded-[1.8rem] border border-[#e29ba8]/14 bg-[#e29ba8]/06 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Droplets size={14} className="text-[#efbac2]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#efbac2]">Baixa automatica</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {servico.consumos.map((consumo) => (
                      <span key={consumo.produtoId} className="rounded-full border border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 dark:text-white/64 shadow-sm">
                        {consumo.quantidade}x {consumo.produto?.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.article>
          ))}
        </AnimatePresence>

        {filteredServicos.length === 0 && (
          <div className="col-span-full rounded-[2.2rem] border border-dashed border-slate-300 dark:border-white/5 bg-white/40 dark:bg-white/[0.03] px-6 py-20 text-center">
            <Package size={44} className="mx-auto text-gray-400 dark:text-white/18" />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-gray-400 dark:text-white/38">Nenhum servico encontrado</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 p-3 backdrop-blur-md sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2.2rem] border border-slate-200/60 bg-white/95 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] dark:border-white/5 dark:bg-[#1a171f]/95 backdrop-blur-2xl">
            <div className="mb-0 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200/60 px-4 py-4 dark:border-white/5 sm:px-6 sm:py-6 md:px-8">
              <div>
                <p className="brand-kicker text-[#efbac2]">Precificacao e estoque</p>
                <h2 className="mt-2 text-2xl sm:text-4xl font-brand-display text-gray-900 dark:text-white leading-none">{editingId ? 'Editar' : 'Novo'} servico</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600 dark:text-white/64 hover:text-gray-900 dark:hover:text-white">
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4 pt-4 custom-scrollbar sm:px-6 sm:pb-6 sm:pt-6 md:px-8 md:pb-8">
                <div className="grid gap-4 sm:p-0 md:grid-cols-2">
                  <Field label="Nome do servico" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
                  <Field label="Preco de venda" type="number" value={form.preco} onChange={(value) => setForm((prev) => ({ ...prev, preco: value }))} required icon={<DollarSign size={14} />} />
                </div>

                <Field label="Descricao" value={form.descricao} onChange={(value) => setForm((prev) => ({ ...prev, descricao: value }))} placeholder="Descricao curta do servico para o cliente" />

                <div className="grid gap-4 sm:p-0 md:grid-cols-2">
                  <DurationField hours={horas} minutes={minutos} onHoursChange={(value) => updateDuration(value, minutos)} onMinutesChange={(value) => updateDuration(horas, value)} />
                  <Field label="Custo dos insumos" type="number" value={form.custoProduto} onChange={(value) => setForm((prev) => ({ ...prev, custoProduto: value }))} icon={<TrendingUp size={14} />} />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/42">Categoria do servico</label>
                  <select
                    value={form.categoriaId}
                    onChange={(event) => setForm((prev) => ({ ...prev, categoriaId: event.target.value }))}
                    className="w-full rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.04] px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white outline-none transition focus:border-[#e29ba8]/32 focus:bg-white/60 dark:focus:bg-white/[0.06] premium-focus-input"
                  >
                    <option value="">Sem categoria</option>
                    {categoriasServicos.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 dark:text-white/38">
                    Profissionais marcados com esta categoria recebem este servico automaticamente.
                  </p>
                </div>

                <div className="rounded-[2rem] border border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-black/14 p-4 sm:p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <Boxes size={16} className="text-[#efbac2]" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#efbac2]">Consumo de produtos</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-white/52">Defina o que sai automaticamente do estoque quando o servico for concluido.</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {produtosDisponiveis.map((produto) => {
                      const selected = form.consumosProdutos.find((item) => item.produtoId === produto.id);
                      return (
                        <div key={produto.id} className={cn('rounded-[1.5rem] border p-4 transition-all', selected ? 'border-[#e29ba8]/28 bg-[#e29ba8]/08' : 'border-slate-200 dark:border-white/5 bg-white/30 dark:bg-white/[0.03]')}>
                          <div className={cn('flex flex-col gap-3', !isCompactPage && 'md:flex-row md:items-center md:justify-between')}>
                            <button type="button" onClick={() => toggleProduto(produto.id)} className="text-left outline-none">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{produto.nome}</p>
                              <p className="mt-1 text-xs text-gray-400 dark:text-white/42">Estoque atual: {produto.estoque}</p>
                            </button>

                            <div className="flex items-center gap-3">
                              {selected && (
                                <input
                                  type="number"
                                  min="1"
                                  value={selected.quantidade}
                                  onChange={(event) => updateConsumo(produto.id, event.target.value)}
                                  className="w-24 rounded-[1rem] border border-slate-200 dark:border-white/5 bg-white/70 dark:bg-[#332832] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#e29ba8]/28 premium-focus-input"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => toggleProduto(produto.id)}
                                className={cn(
                                  'rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
                                  selected ? 'bg-[#de97a5] text-white' : 'border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.04] text-gray-600 dark:text-white/72 hover:text-gray-900 dark:hover:text-white'
                                )}
                              >
                                {selected ? 'Vinculado' : 'Usar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {produtosDisponiveis.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-white/30 text-center py-4">Nenhum produto cadastrado no estoque.</p>
                    )}
                  </div>
                </div>

                {editingId && (
                  <label className="flex items-center gap-4 rounded-[1.6rem] border border-slate-200/60 dark:border-white/5 bg-white/30 dark:bg-white/[0.03] p-5 cursor-pointer select-none">
                    <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((prev) => ({ ...prev, ativo: event.target.checked }))} className="h-4 w-4 accent-[#de97a5]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Servico ativo</p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-white/42">Desative sem excluir caso queira esconder do catalogo.</p>
                    </div>
                  </label>
                )}
              </div>

              <div className="sticky bottom-0 flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-white/5 dark:bg-[#1a171f]/95 sm:px-6 md:flex-row md:px-8">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-[1.4rem] border border-slate-200/50 dark:border-white/5 bg-white/30 dark:bg-white/[0.04] px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/66 hover:text-gray-900 dark:hover:text-white">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-3 rounded-[1.4rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-slate-950 px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] shadow-[0_16px_35px_-12px_rgba(222,151,165,0.65)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-55">
                  {saving ? 'Processando...' : editingId ? 'Salvar servico' : 'Criar servico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, icon, required = false }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/42">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/28">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.04] px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white outline-none transition placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-[#e29ba8]/32 focus:bg-white/60 dark:focus:bg-white/[0.06] premium-focus-input',
            icon && 'pl-14'
          )}
        />
      </div>
    </div>
  );
}

function DurationField({ hours, minutes, onHoursChange, onMinutesChange }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/42">Duracao</label>
      <div className="grid grid-cols-2 gap-3 rounded-[1.35rem] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.04] p-3">
        <select value={hours} onChange={(event) => onHoursChange(event.target.value)} className="rounded-[1rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#e29ba8]/28 focus:bg-white/60 dark:focus:bg-[#1a171f] premium-focus-input">
          {Array.from({ length: 9 }, (_, index) => (
            <option key={index} value={index} className="bg-white dark:bg-[#1a171f] text-gray-900 dark:text-white">
              {index}h
            </option>
          ))}
        </select>
        <select value={minutes} onChange={(event) => onMinutesChange(event.target.value)} className="rounded-[1rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#e29ba8]/28 focus:bg-white/60 dark:focus:bg-[#1a171f] premium-focus-input">
          {[0, 15, 30, 45].map((value) => (
            <option key={value} value={value} className="bg-white dark:bg-[#1a171f] text-gray-900 dark:text-white">
              {value}min
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InfoPill({ icon, label, value, tone = 'rose' }) {
  return (
    <div className={cn('rounded-[1.75rem] border px-5 py-5', tone === 'emerald' ? 'border-emerald-200/50 dark:border-emerald-500/10 bg-emerald-500/[0.02]' : 'border-slate-200/50 dark:border-white/5 bg-white/30 dark:bg-black/14')}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', tone === 'emerald' ? 'bg-emerald-400/12 text-emerald-600 dark:text-emerald-200 border-emerald-400/20' : 'bg-[#e29ba8]/10 text-[#d48997] border-[#e29ba8]/20')}>
          {icon}
        </span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-white/40">{label}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white leading-none">{value}</p>
        </div>
      </div>
    </div>
  );
}
