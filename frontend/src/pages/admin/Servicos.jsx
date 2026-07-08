import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, Clock, DollarSign, Droplets, Edit3, Package, Plus, Scissors, Search, Tag, Trash2, TrendingUp, X } from 'lucide-react';
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
    if (!window.confirm('Deseja excluir este serviço?')) return;
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
    if (!window.confirm('Deseja excluir esta categoria de serviços? Os serviços continuam existindo, apenas ficam sem categoria.')) return;
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
    <motion.div ref={pageRef} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <header className={cn('flex flex-col gap-5 border-b border-black/[0.03] dark:border-white/[0.03] pb-6', !isCompactPage && 'md:flex-row md:items-end md:justify-between')}>
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Scissors className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Portfólio de serviços</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Catálogo <span className="text-[#d48997]">BellaPro</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Estruture o menu do salão com preço, duração, margem e baixa automática de estoque.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all"
        >
          <Plus size={16} /> Novo serviço
        </motion.button>
      </header>

      {/* Search + Categories */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar serviços..."
            className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
          />
        </div>

        <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997] border border-[#d48997]/20 shrink-0">
              <Tag size={16} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#d48997]">Categorias de serviços</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                Agrupe serviços por especialidade para facilitar o cadastro dos profissionais.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={novaCategoriaServico}
              onChange={(event) => setNovaCategoriaServico(event.target.value)}
              placeholder="Ex.: Cabeleireiro"
              className="flex-1 h-11 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={handleCreateCategoriaServico}
              className="rounded-xl bg-[#d48997]/10 hover:bg-[#d48997]/15 px-4 py-2.5 text-xs font-semibold text-[#d48997] transition shrink-0"
            >
              Criar categoria
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categoriasServicos.map((categoria) => (
              <div
                key={categoria.id}
                className="inline-flex items-center gap-2 rounded-full border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-white/5 px-3 py-1.5"
              >
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                  {categoria.nome} ({(categoria.servicos || []).length})
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategoriaServico(categoria.id)}
                  className="text-gray-400 transition hover:text-red-500"
                  aria-label={`Excluir categoria ${categoria.nome}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {categoriasServicos.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">Nenhuma categoria criada ainda.</span>
            )}
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className={cn('grid gap-4', showThreeCards ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2')}>
        <AnimatePresence>
          {filteredServicos.map((servico) => (
            <motion.article
              key={servico.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 shadow-sm hover:border-[#e29ba8]/30 dark:hover:border-[#e29ba8]/20 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997] border border-[#d48997]/20 transition-all group-hover:rotate-6 shrink-0">
                  <Scissors size={20} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(servico)} className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-gray-400 transition hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(servico.id)} className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-gray-400 transition hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-serif font-normal text-gray-900 dark:text-white leading-tight">{servico.nome}</h2>
                  {!servico.ativo && (
                    <span className="rounded-full border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2.5 py-0.5 text-[9px] font-semibold text-gray-500 dark:text-gray-400">
                      Inativo
                    </span>
                  )}
                  {servico.categoria?.nome && (
                    <span className="rounded-full border border-[#d48997]/25 bg-[#d48997]/10 px-2.5 py-0.5 text-[9px] font-semibold text-[#d48997]">
                      {servico.categoria.nome}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed min-h-[32px]">
                  {servico.descricao || 'Serviço ainda sem descrição detalhada.'}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-black/[0.04] dark:border-white/[0.04] bg-black/[0.01] dark:bg-white/[0.01] p-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#d48997]" />
                    <div>
                      <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500">Duração</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDurationLabel(servico.duracaoMin)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500">Preço</p>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(servico.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {(servico.consumos || []).length > 0 && (
                <div className="mt-4 rounded-xl border border-[#d48997]/15 bg-[#d48997]/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Droplets size={12} className="text-[#d48997]" />
                    <p className="text-[9px] font-semibold text-[#d48997]">Baixa automática</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {servico.consumos.map((consumo) => (
                      <span key={consumo.produtoId} className="rounded-full border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-white/5 px-2.5 py-1 text-[9px] font-semibold text-gray-600 dark:text-gray-300">
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
          <div className="col-span-full rounded-2xl border border-dashed border-black/[0.06] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] px-8 py-16 text-center shadow-sm">
            <Package size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 font-serif font-normal text-xl text-gray-905 dark:text-white">Nenhum serviço encontrado</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-400 dark:text-gray-500">
              Cadastre o primeiro serviço ou refine sua busca.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-md p-3 sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]/95">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.03] dark:border-white/5 px-5 py-5 sm:px-8">
              <div>
                <p className="text-[10px] font-semibold text-[#d48997]">Precificação e estoque</p>
                <h2 className="mt-1 font-serif font-normal text-xl sm:text-2xl text-gray-905 dark:text-white">{editingId ? 'Editar' : 'Novo'} serviço</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-5 custom-scrollbar sm:px-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Nome do serviço</span>
                    <input value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} required className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400" />
                  </label>
                  <label>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Preço de venda</span>
                    <input type="number" value={form.preco} onChange={(e) => setForm((prev) => ({ ...prev, preco: e.target.value }))} required className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all" />
                  </label>
                </div>

                <label>
                  <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Descrição</span>
                  <input value={form.descricao} onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))} placeholder="Descrição curta do serviço para o cliente" className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400" />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Duração</span>
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-2">
                      <select value={horas} onChange={(e) => updateDuration(e.target.value, minutos)} className="rounded-lg border border-black/[0.04] dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none">
                        {Array.from({ length: 9 }, (_, i) => (
                          <option key={i} value={i}>{i}h</option>
                        ))}
                      </select>
                      <select value={minutos} onChange={(e) => updateDuration(horas, e.target.value)} className="rounded-lg border border-black/[0.04] dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none">
                        {[0, 15, 30, 45].map((v) => (
                          <option key={v} value={v}>{v}min</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Custo dos insumos</span>
                    <input type="number" value={form.custoProduto} onChange={(e) => setForm((prev) => ({ ...prev, custoProduto: e.target.value }))} className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all" />
                  </label>
                </div>

                <div>
                  <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Categoria do serviço</span>
                  <select
                    value={form.categoriaId}
                    onChange={(e) => setForm((prev) => ({ ...prev, categoriaId: e.target.value }))}
                    className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                  >
                    <option value="">Sem categoria</option>
                    {categoriasServicos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">Profissionais marcados com esta categoria recebem este serviço automaticamente.</p>
                </div>

                <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <Boxes size={16} className="text-[#d48997]" />
                    <div>
                      <p className="text-[10px] font-semibold text-[#d48997]">Consumo de produtos</p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Defina o que sai do estoque quando o serviço for concluído.</p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {produtosDisponiveis.map((produto) => {
                      const selected = form.consumosProdutos.find((item) => item.produtoId === produto.id);
                      return (
                        <div key={produto.id} className={cn('rounded-xl border p-3.5 transition-all', selected ? 'border-[#d48997]/30 bg-[#d48997]/5' : 'border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-white/[0.01]')}>
                          <div className={cn('flex flex-col gap-3', !isCompactPage && 'md:flex-row md:items-center md:justify-between')}>
                            <button type="button" onClick={() => toggleProduto(produto.id)} className="text-left outline-none">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{produto.nome}</p>
                              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Estoque atual: {produto.estoque}</p>
                            </button>

                            <div className="flex items-center gap-2">
                              {selected && (
                                <input
                                  type="number"
                                  min="1"
                                  value={selected.quantidade}
                                  onChange={(e) => updateConsumo(produto.id, e.target.value)}
                                  className="w-20 h-9 rounded-lg border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997]"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => toggleProduto(produto.id)}
                                className={cn(
                                  'rounded-lg px-3 py-2 text-[10px] font-semibold transition-all',
                                  selected ? 'bg-[#d48997] text-white' : 'border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Nenhum produto cadastrado no estoque.</p>
                    )}
                  </div>
                </div>

                {editingId && (
                  <label className="flex items-center gap-4 rounded-xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] p-4 cursor-pointer select-none">
                    <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))} className="h-4 w-4 accent-[#d48997]" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Serviço ativo</p>
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Desative sem excluir caso queira esconder do catálogo.</p>
                    </div>
                  </label>
                )}
              </div>

              <div className="sticky bottom-0 flex shrink-0 flex-col gap-3 border-t border-black/[0.03] bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur px-5 py-4 dark:border-white/5 sm:px-8 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModalOpen(false)} className="inline-flex items-center justify-center rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:text-white px-5 py-2.5 text-xs font-semibold text-gray-500 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-70">
                  {saving ? 'Processando...' : editingId ? 'Salvar serviço' : 'Criar serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
