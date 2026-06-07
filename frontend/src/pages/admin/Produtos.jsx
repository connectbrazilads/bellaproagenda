import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Edit3,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  createProduto,
  deleteProduto,
  getProdutos,
  updateProduto,
} from '../../services/api';
import { cn } from '../../lib/utils';

const EMPTY_FORM = {
  nome: '',
  descricao: '',
  preco: '',
  estoque: 0,
};

function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  async function carregar() {
    setLoading(true);
    try {
      const response = await getProdutos();
      setProdutos(response?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(
    () => produtos.filter((produto) => produto.nome?.toLowerCase().includes(busca.toLowerCase())),
    [produtos, busca]
  );

  function fecharModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function abrirNovo() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function editar(produto) {
    setEditing(produto);
    setForm({
      nome: produto.nome || '',
      descricao: produto.descricao || '',
      preco: produto.preco || '',
      estoque: produto.estoque || 0,
    });
    setModalOpen(true);
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este produto?')) return;
    await deleteProduto(id);
    await carregar();
  }

  async function salvar(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        preco: Number(form.preco || 0),
        estoque: Number(form.estoque || 0),
      };

      if (editing) {
        await updateProduto(editing.id, payload);
      } else {
        await createProduto(payload);
      }

      fecharModal();
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-8 pb-20 px-4">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <ShoppingBag className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Estoque inteligente</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Gestão de <span className="text-[#d48997]">Produtos</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Controle itens de revenda e insumos profissionais com uma leitura mais refinada do seu estoque.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Localizar produto..."
              className="h-11 w-full min-w-[240px] rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-11 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            <Plus className="h-4 w-4" /> Novo produto
          </motion.button>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-[#d48997]" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[0.06] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] px-8 py-16 text-center shadow-sm">
          <Package className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 font-serif font-normal text-xl text-gray-905 dark:text-white">Nenhum produto encontrado</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-400 dark:text-gray-500">
            Cadastre produtos para acompanhar revenda, uso interno e sinais de reposição.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filtrados.map((produto) => {
            const estoqueBaixo = Number(produto.estoque || 0) < 5;
            const consumos = (produto.consumosServico || [])
              .slice(0, 2)
              .map((item) => item.servico?.nome)
              .filter(Boolean)
              .join(', ');

            return (
              <article
                key={produto.id}
                className="flex flex-col rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 shadow-sm hover:border-[#e29ba8]/30 dark:hover:border-[#e29ba8]/20 transition-all duration-300 group"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997] border border-[#d48997]/20 shrink-0 group-hover:rotate-6 transition-all">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => editar(produto)} className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-gray-400 transition hover:text-gray-900 dark:hover:text-white">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => excluir(produto.id)} className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2 text-gray-400 transition hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-serif font-normal text-gray-900 dark:text-white leading-tight">{produto.nome}</h2>
                <p className="mt-2 flex-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  {produto.descricao || 'Produto cadastrado para uso profissional ou revenda no salão.'}
                </p>

                {(produto.consumosServico || []).length > 0 && (
                  <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-500/5 p-3">
                    <p className="text-[9px] font-semibold text-blue-600 dark:text-blue-400">Uso automático em serviços</p>
                    <p className="mt-1 text-xs text-blue-700 dark:text-blue-300 font-medium">
                      {consumos}
                      {(produto.consumosServico || []).length > 2 ? ` +${produto.consumosServico.length - 2}` : ''}
                    </p>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/[0.03] dark:border-white/5 pt-4">
                  <div>
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500">Preço</p>
                    <p className="mt-1 text-base font-semibold text-[#d48997]">{moeda(produto.preco)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500">Estoque</p>
                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      {estoqueBaixo && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                      <p className={cn('text-base font-semibold', estoqueBaixo ? 'text-rose-500' : 'text-gray-900 dark:text-white')}>
                        {produto.estoque || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen ? (
          <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={fecharModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.form
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              onSubmit={salvar}
              className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0c0c0e]/95 custom-scrollbar sm:p-6 md:p-8"
            >
              <button type="button" onClick={fecharModal} className="absolute right-4 top-4 rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm">
                <X className="h-4 w-4" />
              </button>

              <div className="mb-6 border-b border-black/[0.03] dark:border-white/5 pb-4">
                <p className="text-[10px] font-semibold text-[#d48997]">Catálogo interno</p>
                <h2 className="mt-1 font-serif font-normal text-xl sm:text-2xl text-gray-905 dark:text-white">
                  {editing ? 'Editar produto' : 'Novo produto'}
                </h2>
              </div>

              <div className="space-y-4">
                <label>
                  <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Nome do produto</span>
                  <input
                    value={form.nome}
                    onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                    required
                    className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400"
                    placeholder="Ex.: máscara reconstrutora"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Descrição</span>
                  <textarea
                    value={form.descricao}
                    onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400 resize-none"
                    placeholder="Benefícios, uso e observações comerciais."
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Preço</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.preco}
                      onChange={(event) => setForm((prev) => ({ ...prev, preco: event.target.value }))}
                      required
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Estoque inicial</span>
                    <input
                      type="number"
                      min="0"
                      value={form.estoque}
                      onChange={(event) => setForm((prev) => ({ ...prev, estoque: Number(event.target.value || 0) }))}
                      required
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:justify-end">
                <button type="button" onClick={fecharModal} className="inline-flex items-center justify-center rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:text-white px-5 py-2.5 text-xs font-semibold text-gray-500 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-70">
                  {saving ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </motion.form>
          </div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
