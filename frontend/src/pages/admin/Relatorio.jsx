import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  MinusCircle, 
  Award, 
  Calendar, 
  ArrowRight,
  Plus,
  Trash2,
  PieChart as PieIcon,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { getRelatorio, createDespesa, deleteDespesa } from '../../services/api';
import { cn, formatDateInput } from '../../lib/utils';

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
    data: today 
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

  useEffect(() => { carregar(); }, [inicio, fim]);

  async function handleAddDespesa(e) {
    e.preventDefault();
    await createDespesa(formDespesa);
    setModalDespesa(false);
    setFormDespesa({ 
      descricao: '', 
      valor: 0, 
      categoria: 'outros', 
      data: formatDateInput() 
    });
    carregar();
  }

  async function handleExcluirDespesa(id) {
    if (!confirm('Excluir despesa?')) return;
    await deleteDespesa(id);
    carregar();
  }

  const chartData = data ? Object.entries(data.porProfissional).map(([name, info]) => ({
    name,
    total: info.total,
    comissao: info.comissao
  })) : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 md:p-8 border-b border-gray-100 dark:border-white/5 pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500 animate-bounce" />
            <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Intelig?ncia Financeira</h2>
          </div>
          <h1 className="text-2xl sm:text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-4">Seu <span className="text-[#d48997]">Lucro</span></h1>
          <p className="text-gray-400 font-medium text-xl max-w-xl leading-relaxed">Vis?o estratégica completa de receitas, despesas e performance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalDespesa(true)}
            className="bg-red-500 text-gray-900 dark:text-white px-8 py-5 rounded-[2rem] font-black text-xs shadow-2xl shadow-red-500/20 flex items-center gap-3 uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" /> LANÇAR DESPESA
          </motion.button>
          
          <div className="flex bg-white dark:bg-gray-900/40 backdrop-blur-xl rounded-[2rem] border border-gray-100 dark:border-white/5 p-2 shadow-xl shadow-gray-100/50 dark:shadow-none">
            <input 
              type="date" 
              value={inicio} 
              onChange={e => setInicio(e.target.value)} 
              className="bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none text-gray-900 dark:text-white" 
            />
            <div className="flex items-center px-2 text-gray-300"><ArrowRight size={14} strokeWidth={3} /></div>
            <input 
              type="date" 
              value={fim} 
              onChange={e => setFim(e.target.value)} 
              className="bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none text-gray-900 dark:text-white" 
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="py-40 text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#E29BA8] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data ? (
        <div className="space-y-12">
          {/* Top Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:p-6">
            <FinCard 
              label="Receita Bruta" 
              value={data.total} 
              icon={<DollarSign />} 
              color="emerald" 
              trend="+15%" 
            />
            <FinCard 
              label="Comissões" 
              value={data.totalComissoes} 
              icon={<Award />} 
              color="orange" 
              trend="-2%" 
            />
            <FinCard 
              label="Despesas" 
              value={data.totalDespesas} 
              icon={<MinusCircle />} 
              color="red" 
              trend="+5%" 
            />
            <FinCard 
              label="Lucro Real" 
              value={data.lucroReal} 
              icon={<TrendingUp />} 
              color="purple" 
              destaque 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:p-10">
            {/* Performance Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[3rem] border border-gray-100 dark:border-white/5 p-12 shadow-2xl shadow-gray-200/20 dark:shadow-none">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Ranking de Artistas</h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Performance por Volume</p>
                </div>
                <div className="w-12 h-12 bg-[#E29BA8]/5 dark:bg-[#8c4a57]/20 rounded-2xl flex items-center justify-center border border-[#E29BA8]/10 dark:border-purple-800/30">
                  <PieIcon className="w-6 h-6 text-[#d48997]" />
                </div>
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }} 
                      padding={{ left: 20, right: 20 }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-black text-white p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                              <p className="text-lg font-black tracking-tighter text-emerald-400">R$ {payload[0].value?.toFixed(2)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="total" radius={[10, 10, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#9333ea' : '#c084fc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-[#050505] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-sm font-black text-red-400 uppercase tracking-[0.3em]">Extrato de Despesas</h3>
                  <div className="px-4 py-2 bg-red-500/20 rounded-full border border-red-500/30 text-[10px] font-black text-red-400 uppercase tracking-widest">
                    {data.despesas.length} ITENS
                  </div>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-4 scrollbar-hide">
                  {data.despesas.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                       <MinusCircle className="w-12 h-12 mx-auto mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Sem despesas registradas</p>
                    </div>
                  ) : (
                    data.despesas.map((d, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={d.id} 
                        className="group flex items-center justify-between p-4 sm:p-6 bg-white/5 rounded-[2rem] border border-gray-200 dark:border-white/5 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-4 sm:p-6">
                           <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:bg-red-500/20 transition-all">💸</div>
                           <div>
                              <p className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none mb-2">{d.descricao}</p>
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{new Date(d.data).toLocaleDateString()} • {d.categoria}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <p className="text-xl font-black text-red-400 tracking-tighter">R$ {Number(d.valor || 0).toFixed(0)}</p>
                           <button onClick={() => handleExcluirDespesa(d.id)} className="p-2 text-gray-400 dark:text-white/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="mt-12 pt-12 border-t border-gray-200 dark:border-white/5">
                   <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total de Saídas</p>
                        <p className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">R$ {data.totalDespesas.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-red-400 font-black text-xs bg-red-400/10 px-4 py-2 rounded-full border border-red-400/20">
                          - {((data.totalDespesas / data.total) * 100).toFixed(1)}% da Receita
                        </span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal Despesa */}
      <AnimatePresence>
        {modalDespesa && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalDespesa(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.form 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onSubmit={handleAddDespesa} 
              className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[3rem] bg-white p-6 shadow-2xl custom-scrollbar dark:bg-gray-900 sm:p-10 md:p-12"
            >
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-8">Lançar Despesa</h2>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Descrição</label>
                  <input 
                    value={formDespesa.descricao} 
                    onChange={e => setFormDespesa({...formDespesa, descricao: e.target.value})} 
                    className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-red-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none transition-all" 
                    placeholder="Ex: Aluguel do Sal?o" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={formDespesa.valor} 
                      onChange={e => setFormDespesa({...formDespesa, valor: parseFloat(e.target.value)})} 
                      className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-red-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none transition-all" 
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Data</label>
                    <input 
                      type="date" 
                      value={formDespesa.data} 
                      onChange={e => setFormDespesa({...formDespesa, data: e.target.value})} 
                      className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-red-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none transition-all" 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Categoria</label>
                  <select 
                    value={formDespesa.categoria} 
                    onChange={e => setFormDespesa({...formDespesa, categoria: e.target.value})} 
                    className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-red-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none appearance-none uppercase text-[10px] tracking-widest"
                  >
                     <option value="aluguel">Aluguel / Fixos</option>
                     <option value="produtos">Produtos / Materiais</option>
                     <option value="marketing">Marketing / Social</option>
                     <option value="luz">Luz / Água / Net</option>
                     <option value="outros">Outros</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setModalDespesa(false)} className="flex-1 py-5 rounded-2xl border-2 border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Cancelar</button>
                   <button type="submit" className="flex-1 py-5 bg-red-600 text-gray-900 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all">Lançar Agora</button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FinCard({ label, value, icon, color, trend, destaque }) {
  const colors = {
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 shadow-emerald-500/5",
    orange: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20 shadow-orange-500/5",
    red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20 shadow-red-500/5",
    purple: "bg-gradient-to-br from-[#d48997] to-indigo-700 text-white border-transparent shadow-[#E29BA8]/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn(
        "p-5 md:p-10 rounded-[2rem] border relative overflow-hidden transition-all shadow-2xl",
        colors[color],
        destaque ? "shadow-[#E29BA8]/30 ring-4 ring-[#E29BA8]/10" : "shadow-gray-200/20 dark:shadow-none"
      )}
    >
      <div className="flex justify-between items-start mb-8">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border",
          color === 'purple' ? "bg-white/10 border-gray-200 dark:border-white/10" : "bg-white dark:bg-gray-800 border-inherit"
        )}>
          {React.cloneElement(icon, { size: 24, strokeWidth: 3 })}
        </div>
        {trend && (
          <span className={cn(
            "flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-full border",
            trend.startsWith('+') ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-red-500 border-red-500/20 bg-red-500/5"
          )}>
            {trend.startsWith('+') ? <ArrowUpRight size={10} strokeWidth={4} /> : <ArrowDownRight size={10} strokeWidth={4} />}
            {trend}
          </span>
        )}
      </div>

      <p className={cn(
        "text-[10px] font-black uppercase tracking-[0.3em] mb-2",
        color === 'purple' ? "text-[#E29BA8]/10" : "text-gray-400"
      )}>
        {label}
      </p>
      <p className="text-2xl sm:text-4xl font-black tracking-tighter">
        {Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
    </motion.div>
  );
}
