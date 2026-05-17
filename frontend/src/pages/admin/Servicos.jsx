import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, Clock, DollarSign, Droplets, Edit3, Package, Plus, Scissors, Trash2, TrendingUp } from 'lucide-react';
import { createServico, deleteServico, getProdutos, getServicos, updateServico } from '../../services/api';
import { cn, formatDurationLabel } from '../../lib/utils';

const EMPTY = {
  nome: '',
  descricao: '',
  duracaoMin: 60,
  preco: '',
  custoProduto: 0,
  ativo: true,
  consumosProdutos: [],
};

export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [servicosResponse, produtosResponse] = await Promise.all([getServicos(), getProdutos()]);
    setServicos(servicosResponse.data || []);
    setProdutosDisponiveis(produtosResponse.data || []);
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

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col gap-5 border-b border-gray-200 dark:border-white/5 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#e29ba8]" />
            <p className="brand-kicker">Portfólio de serviços</p>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-brand-display text-gray-900 dark:text-white">
            Catálogo <span className="brand-text-gradient">BellaPro</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-200 dark:text-white/58">
            Estruture o menu do salão com preço, duração, margem e baixa automática de estoque.
          </p>
        </div>

        <button onClick={openCreate} className="inline-flex items-center gap-3 rounded-[1.5rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white">
          <Plus size={16} />
          Novo serviço
        </button>
      </header>

      <div className="grid gap-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {servicos.map((servico) => (
            <motion.article
              key={servico.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] p-4 sm:p-6 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white dark:bg-[#1a171f] text-[#efbac2]">
                  <Scissors size={26} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(servico)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-gray-900 dark:text-white">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(servico.id)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] p-3 text-gray-500 dark:text-white/66 transition hover:text-red-200">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-brand-display text-gray-900 dark:text-white">{servico.nome}</h2>
                  {!servico.ativo && (
                    <span className="rounded-full bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-200 dark:text-white/54">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-200 dark:text-white/56">
                  {servico.descricao || 'Serviço ainda sem descrição detalhada.'}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <InfoPill icon={<Clock size={15} />} label="Duração" value={formatDurationLabel(servico.duracaoMin)} />
                <InfoPill
                  icon={<DollarSign size={15} />}
                  label="Preço"
                  value={Number(servico.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  tone="emerald"
                />
              </div>

              {(servico.consumos || []).length > 0 && (
                <div className="mt-6 rounded-[1.8rem] border border-[#e29ba8]/14 bg-[#e29ba8]/06 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Droplets size={14} className="text-[#efbac2]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#efbac2]">Baixa automática</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {servico.consumos.map((consumo) => (
                      <span key={consumo.produtoId} className="rounded-full border border-gray-200 dark:border-white/5 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 dark:text-white/64">
                        {consumo.quantidade}x {consumo.produto?.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.article>
          ))}
        </AnimatePresence>

        {servicos.length === 0 && (
          <div className="col-span-full rounded-[2rem] border border-dashed border-gray-200 dark:border-white/5 bg-white/[0.03] px-6 py-20 text-center">
            <Package size={44} className="mx-auto text-white/18" />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">Nenhum serviço cadastrado ainda</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/82 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] p-4 sm:p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] md:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="brand-kicker">Precificação e estoque</p>
                <h2 className="mt-2 text-2xl sm:text-4xl font-brand-display text-gray-900 dark:text-white">{editingId ? 'Editar' : 'Novo'} serviço</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600 dark:text-white/64">
                Fechar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-4 sm:p-6 md:grid-cols-2">
                <Field label="Nome do serviço" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
                <Field label="Preço de venda" type="number" value={form.preco} onChange={(value) => setForm((prev) => ({ ...prev, preco: value }))} required icon={<DollarSign size={14} />} />
              </div>

              <Field label="Descrição" value={form.descricao} onChange={(value) => setForm((prev) => ({ ...prev, descricao: value }))} />

              <div className="grid gap-4 sm:p-6 md:grid-cols-2">
                <DurationField hours={horas} minutes={minutos} onHoursChange={(value) => updateDuration(value, minutos)} onMinutesChange={(value) => updateDuration(horas, value)} />
                <Field label="Custo dos insumos" type="number" value={form.custoProduto} onChange={(value) => setForm((prev) => ({ ...prev, custoProduto: value }))} icon={<TrendingUp size={14} />} />
              </div>

              <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-black/14 p-4 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <Boxes size={16} className="text-[#efbac2]" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#efbac2]">Consumo de produtos</p>
                    <p className="mt-1 text-sm text-gray-200 dark:text-white/52">Defina o que sai automaticamente do estoque quando o serviço for concluído.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {produtosDisponiveis.map((produto) => {
                    const selected = form.consumosProdutos.find((item) => item.produtoId === produto.id);
                    return (
                      <div key={produto.id} className={cn('rounded-[1.5rem] border p-4', selected ? 'border-[#e29ba8]/28 bg-[#e29ba8]/08' : 'border-gray-200 dark:border-white/5 bg-white/[0.03]')}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <button type="button" onClick={() => toggleProduto(produto.id)} className="text-left">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{produto.nome}</p>
                            <p className="mt-1 text-xs text-white/42">Estoque atual: {produto.estoque}</p>
                          </button>

                          <div className="flex items-center gap-3">
                            {selected && (
                              <input
                                type="number"
                                min="1"
                                value={selected.quantidade}
                                onChange={(event) => updateConsumo(produto.id, event.target.value)}
                                className="w-24 rounded-[1rem] border border-gray-200 dark:border-white/5 bg-[#332832] px-3 py-2 text-sm text-white outline-none focus:border-[#e29ba8]/28"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => toggleProduto(produto.id)}
                              className={cn(
                                'rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
                                selected ? 'bg-[#de97a5] text-white' : 'border border-gray-200 dark:border-white/5 bg-white/[0.04] text-white/72'
                              )}
                            >
                              {selected ? 'Vinculado' : 'Usar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingId && (
                <label className="flex items-center gap-4 rounded-[1.6rem] border border-gray-200 dark:border-white/5 bg-white/[0.03] p-5">
                  <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((prev) => ({ ...prev, ativo: event.target.checked }))} className="h-4 w-4 accent-[#de97a5]" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Serviço ativo</p>
                    <p className="mt-1 text-xs text-white/42">Desative sem excluir caso queira esconder do catálogo.</p>
                  </div>
                </label>
              )}

              <div className="flex flex-col gap-3 md:flex-row">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-[1.4rem] border border-gray-200 dark:border-white/5 bg-white/[0.04] px-6 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-white/66">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 rounded-[1.5rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                  {saving ? 'Salvando...' : editingId ? 'Salvar serviço' : 'Criar serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', icon, required = false }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">{label}</label>
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

function DurationField({ hours, minutes, onHoursChange, onMinutesChange }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-white/42">Duração</label>
      <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-gray-200 dark:border-white/5 bg-[#332832] p-3">
        <select value={hours} onChange={(event) => onHoursChange(event.target.value)} className="rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28">
          {Array.from({ length: 9 }, (_, index) => (
            <option key={index} value={index}>
              {index}h
            </option>
          ))}
        </select>
        <select value={minutes} onChange={(event) => onMinutesChange(event.target.value)} className="rounded-[1rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] px-4 py-3 text-sm text-white outline-none focus:border-[#e29ba8]/28">
          {[0, 15, 30, 45].map((value) => (
            <option key={value} value={value}>
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
    <div className={cn('rounded-[1.5rem] border px-4 py-4', tone === 'emerald' ? 'border-emerald-300/16 bg-emerald-400/08' : 'border-gray-200 dark:border-white/5 bg-black/14')}>
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone === 'emerald' ? 'bg-emerald-400/12 text-emerald-200' : 'bg-[#e29ba8]/10 text-[#efbac2]')}>
          {icon}
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">{label}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
