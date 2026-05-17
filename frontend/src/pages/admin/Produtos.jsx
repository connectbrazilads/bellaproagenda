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
    <div className="mx-auto flex max-w-7xl flex-col gap-4 md:p-8 pb-16">
      <section className="flex flex-col gap-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#E29BA8]">
            <ShoppingBag className="h-4 w-4" />
            Estoque inteligente
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Gestao de <span className="text-[#E29BA8]">Produtos</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Controle itens de revenda e insumos profissionais com uma leitura mais refinada do seu estoque.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#806871]" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Localizar produto..."
              className="h-14 w-full min-w-[260px] rounded-full border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.04)] pl-14 pr-5 text-sm text-[#faf7f6] outline-none placeholder:text-[#806871]"
            />
          </div>

          <button
            type="button"
            onClick={abrirNovo}
            className="inline-flex min-h-[48px] sm:min-h-[56px] items-center justify-center gap-2 sm:gap-3 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 sm:px-8 text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[rgba(233,155,168,0.22)] border-t-[#e99ba8]" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(233,155,168,0.16)] bg-[rgba(41,31,37,0.82)] px-8 py-16 text-center">
          <Package className="mx-auto h-14 w-14 text-[#806871]" />
          <h2 className="mt-6 font-['Playfair_Display'] text-3xl text-[#faf7f6]">Nenhum produto encontrado</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#c7adb4]">
            Cadastre produtos para acompanhar revenda, uso interno e sinais de reposicao.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:p-6 sm:grid-cols-2 xl:grid-cols-4">
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
                className="flex flex-col rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] transition hover:border-[rgba(233,155,168,0.18)]"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editar(produto)}
                      className="rounded-2xl border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-3 text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#f7c1b6]"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(produto.id)}
                      className="rounded-2xl border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-3 text-[#c7adb4] transition hover:border-[rgba(220,120,120,0.22)] hover:text-[#f4aaaa]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">{produto.nome}</h2>
                <p className="mt-3 flex-1 text-sm leading-7 text-[#c7adb4]">
                  {produto.descricao || 'Produto cadastrado para uso profissional ou revenda no salao.'}
                </p>

                {(produto.consumosServico || []).length ? (
                  <div className="mt-5 rounded-[22px] border border-[rgba(122,165,222,0.22)] bg-[rgba(122,165,222,0.08)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b7d0f4]">
                      Uso automatico em servicos
                    </p>
                    <p className="mt-2 text-sm text-[#d5e4fb]">
                      {consumos}
                      {(produto.consumosServico || []).length > 2 ? ` +${produto.consumosServico.length - 2}` : ''}
                    </p>
                  </div>
                ) : null}

                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-white/5 pt-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Preco</p>
                    <p className="mt-2 text-2xl font-semibold text-[#f7c1b6]">{moeda(produto.preco)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Estoque</p>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      {estoqueBaixo ? <AlertTriangle className="h-4 w-4 text-[#f4aaaa]" /> : null}
                      <p
                        className={cn(
                          'text-2xl font-semibold',
                          estoqueBaixo ? 'text-[#f4aaaa]' : 'text-[#faf7f6]'
                        )}
                      >
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

      <AnimatePresence>
        {modalOpen ? (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={fecharModal}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              onSubmit={salvar}
              className="relative z-10 w-full max-w-xl rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.98)] p-4 sm:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:p-8"
            >
              <div className="mb-8 border-b border-gray-200 dark:border-white/5 pb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">Catalogo interno</p>
                <h2 className="mt-3 font-['Playfair_Display'] text-2xl sm:text-4xl text-[#faf7f6]">
                  {editing ? 'Editar produto' : 'Novo produto'}
                </h2>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                    Nome do produto
                  </span>
                  <input
                    value={form.nome}
                    onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                    required
                    className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                    placeholder="Ex.: mascara reconstrutora"
                  />
                </label>

                <label className="block">
                  <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                    Descricao
                  </span>
                  <textarea
                    value={form.descricao}
                    onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                    rows={4}
                    className="w-full rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 py-4 text-base leading-7 text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                    placeholder="Beneficios, uso e observacoes comerciais."
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                      Preco
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.preco}
                      onChange={(event) => setForm((prev) => ({ ...prev, preco: event.target.value }))}
                      required
                      className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                      Estoque inicial
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.estoque}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          estoque: Number(event.target.value || 0),
                        }))
                      }
                      required
                      className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-gray-200 dark:border-white/5 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-[48px] sm:min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 sm:px-7 text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </motion.form>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
