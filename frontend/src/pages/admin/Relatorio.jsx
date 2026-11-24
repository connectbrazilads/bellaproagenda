import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  MinusCircle,
  Award,
  ArrowRight,
  Plus,
  Trash2,
  PieChart as PieIcon,
  X,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { getRelatorio, createDespesa, deleteDespesa } from '../../services/api';
import { cn, formatDateInput } from '../../lib/utils';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export default function Relatorio() {
  const today = formatDateInput();
  const [inicio, setInicio] = useState(today);
  const [fim, setFim] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalDespesa, setModalDespesa] = useState(false);
  const [formDespesa, setFormDespesa] = useState({
    descricao: '',
    valor: 0,
    categoria: 'outros',
    data: today,
  });

  async function carregar() {
    setLoading(true);
    try {
      const res = await getRelatorio({ inicio, fim });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [inicio, fim]);

  async function handleAddDespesa(e) {
    e.preventDefault();
    await createDespesa(formDespesa);
    setModalDespesa(false);
    setFormDespesa({
      descricao: '',
      valor: 0,
      categoria: 'outros',
      data: formatDateInput(),
    });
    carregar();
  }

  async function handleExcluirDespesa(id) {
    if (!confirm('Excluir despesa?')) return;
    await deleteDespesa(id);
    carregar();
  }

  const chartData = data?.porProfissional
    ? Object.entries(data.porProfissional).map(([name, info]) => ({
        name,
        total: info.total,
        comissao: info.comissao,
      }))
    : [];

  const despesasPercentual =
    data && Number(data.total || 0) > 0
      ? ((Number(data.totalDespesas || 0) / Number(data.total)) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <header className="flex flex-col items-start justify-between gap-4 border-b border-[#eae1e4] pb-5 dark:border-[#28212f] lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
            <TrendingUp className="h-4 w-4" />
            <span>Inteligência Financeira</span>
          </div>
          <h1 className="font-brand-display text-3xl font-bold leading-tight text-[#23141c] dark:text-white sm:text-4xl">
            Análise de <span className="italic text-[#b84c6b]">Lucro</span>
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[#6b5761] dark:text-white/60">
            Visão estratégica de receitas, comissões, despesas e performance por profissional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#e2d5da] bg-white px-3 py-2 text-xs font-semibold text-[#23141c] shadow-sm dark:border-[#352b3e] dark:bg-[#1c1721] dark:text-white">
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="bg-transparent outline-none"
            />
            <ArrowRight size={14} className="text-[#b84c6b]" />
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="bg-transparent outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setModalDespesa(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" /> Lançar Despesa
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#eadde1] border-t-[#b84c6b]" />
          <p className="text-xs font-semibold text-[#745e69] dark:text-white/60">
            Carregando relatório...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FinCard label="Receita Bruta" value={data.total} icon={<DollarSign />} color="emerald" />
            <FinCard label="Comissões" value={data.totalComissoes} icon={<Award />} color="amber" />
            <FinCard label="Despesas" value={data.totalDespesas} icon={<MinusCircle />} color="rose" />
            <FinCard label="Lucro Real" value={data.lucroReal} icon={<TrendingUp />} color="plum" destaque />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Performance Chart */}
            <div className="rounded-2xl border border-[#eae1e4] bg-white p-6 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] lg:col-span-2">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
                    Ranking da Equipe
                  </p>
                  <h3 className="mt-1 font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
                    Performance por Volume
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf2f5] text-[#b84c6b] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]">
                  <PieIcon className="h-5 w-5" />
                </div>
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(35,20,28,0.08)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#745e69', fontSize: 11, fontWeight: 600 }}
                      padding={{ left: 16, right: 16 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: 'rgba(198,93,123,0.06)' }}
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded-xl border border-[#eae1e4] bg-[#23141c] px-4 py-3 text-white shadow-lg">
                            <p className="text-[11px] font-bold text-[#f0aab8]">
                              {payload[0].payload.name}
                            </p>
                            <p className="mt-1 text-base font-extrabold tabular-nums">
                              {formatMoney(payload[0].value)}
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="total" radius={[10, 10, 0, 0]} barSize={36}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? '#b84c6b' : '#23141c'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expenses List */}
            <div className="flex flex-col rounded-2xl border border-[#eae1e4] bg-white p-6 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721]">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
                    Extrato de Saídas
                  </p>
                  <h3 className="mt-0.5 font-brand-display text-xl font-bold text-[#23141c] dark:text-white">
                    Despesas do Período
                  </h3>
                </div>
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  {data.despesas?.length || 0} itens
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar max-h-[300px]">
                {!data.despesas?.length ? (
                  <div className="rounded-xl border border-dashed border-[#e2d5da] bg-[#faf7f5] py-12 text-center dark:border-[#352b3e] dark:bg-white/[0.02]">
                    <MinusCircle className="mx-auto mb-2 h-8 w-8 text-[#c9b4be]" />
                    <p className="text-xs font-semibold text-[#745e69] dark:text-white/55">
                      Sem despesas registradas
                    </p>
                  </div>
                ) : (
                  data.despesas.map((d) => (
                    <div
                      key={d.id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-[#f0e8eb] bg-[#faf7f5] px-4 py-3 dark:border-[#28212f] dark:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#23141c] dark:text-white">
                          {d.descricao}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#745e69] dark:text-white/55">
                          {new Date(d.data).toLocaleDateString('pt-BR')} · {d.categoria}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-sm font-extrabold text-rose-600 tabular-nums dark:text-rose-400">
                          {formatMoney(d.valor)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleExcluirDespesa(d.id)}
                          className="rounded-lg p-1.5 text-[#8c727e] transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15"
                          title="Excluir despesa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 border-t border-[#f0e8eb] pt-4 dark:border-[#28212f]">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
                      Total de Saídas
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-[#23141c] tabular-nums dark:text-white">
                      {formatMoney(data.totalDespesas)}
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    -{despesasPercentual}% da receita
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Despesa */}
      <AnimatePresence>
        {modalDespesa && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-4">
            <motion.form
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onSubmit={handleAddDespesa}
              className="relative w-full max-w-md rounded-3xl border border-[#eae1e4] bg-white p-6 shadow-2xl dark:border-[#352b3e] dark:bg-[#1c1721] sm:p-7"
            >
              <div className="mb-5 flex items-center justify-between border-b border-[#f0e8eb] pb-4 dark:border-[#28212f]">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600">
                    Registro de saída
                  </p>
                  <h2 className="mt-0.5 font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
                    Lançar Despesa
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDespesa(false)}
                  className="rounded-xl border border-[#e2d5da] bg-[#faf7f5] p-2 text-[#6b5761] hover:text-[#23141c] dark:border-[#352b3e] dark:bg-white/5 dark:text-white/70"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
                    Descrição
                  </label>
                  <input
                    value={formDespesa.descricao}
                    onChange={(e) => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#e2d5da] bg-white px-4 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
                    placeholder="Ex: Aluguel do salão"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formDespesa.valor}
                      onChange={(e) =>
                        setFormDespesa({ ...formDespesa, valor: parseFloat(e.target.value || 0) })
                      }
                      className="h-11 w-full rounded-xl border border-[#e2d5da] bg-white px-4 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
                      Data
                    </label>
                    <input
                      type="date"
                      value={formDespesa.data}
                      onChange={(e) => setFormDespesa({ ...formDespesa, data: e.target.value })}
                      className="h-11 w-full rounded-xl border border-[#e2d5da] bg-white px-3 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#5b4852] dark:text-white/65">
                    Categoria
                  </label>
                  <select
                    value={formDespesa.categoria}
                    onChange={(e) => setFormDespesa({ ...formDespesa, categoria: e.target.value })}
                    className="h-11 w-full rounded-xl border border-[#e2d5da] bg-white px-3.5 text-sm text-[#23141c] outline-none focus:border-[#b84c6b] dark:border-[#352b3e] dark:bg-[#151119] dark:text-white"
                  >
                    <option value="aluguel">Aluguel / Fixos</option>
                    <option value="produtos">Produtos / Materiais</option>
                    <option value="marketing">Marketing / Social</option>
                    <option value="luz">Luz / Água / Internet</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalDespesa(false)}
                    className="flex-1 rounded-xl border border-[#e2d5da] bg-[#faf7f5] py-3 text-xs font-bold text-[#5b4852] transition hover:bg-[#f1e7ea] dark:border-[#352b3e] dark:bg-white/5 dark:text-white/75"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                  >
                    Lançar Despesa
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinCard({ label, value, icon, color, destaque = false }) {
  const iconTones = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    plum: 'bg-white/15 text-[#f0aab8]',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 shadow-sm',
        destaque
          ? 'border-[#23141c] bg-[#23141c] text-white'
          : 'border-[#eae1e4] bg-white text-[#23141c] dark:border-[#28212f] dark:bg-[#1c1721] dark:text-white'
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            iconTones[color] || iconTones.emerald
          )}
        >
          {React.cloneElement(icon, { size: 18, strokeWidth: 2.2 })}
        </div>
      </div>

      <p
        className={cn(
          'text-[11px] font-bold uppercase tracking-[0.14em]',
          destaque ? 'text-[#f0aab8]' : 'text-[#745e69] dark:text-white/55'
        )}
      >
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums">
        {formatMoney(value)}
      </p>
    </div>
  );
}
