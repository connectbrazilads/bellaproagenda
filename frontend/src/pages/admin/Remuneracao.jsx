import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Search, 
  Calendar as CalendarIcon, 
  User, 
  DollarSign, 
  ChevronRight,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  ChevronDown,
  TrendingUp,
  CreditCard,
  Users,
  CalendarDays,
  RefreshCw as RefreshIcon,
  AlertCircle
} from 'lucide-react';
import { getRelatorioRemuneracao, getProfissionais, updateComissaoPaga } from '../../services/api';
import { cn } from '../../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function Remuneracao() {
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-01'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [profissionalId, setProfissionalId] = useState('');
  const [profissionais, setProfissionais] = useState([]);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedProfs, setExpandedProfs] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const role = localStorage.getItem('salao_user_role');
  const myPid = localStorage.getItem('salao_user_pid');

  useEffect(() => {
    fetchProfissionais();
    if (role === 'profissional' && myPid) {
        setProfissionalId(myPid);
    }
  }, []);

  useEffect(() => {
    fetchDados();
  }, [dataInicio, dataFim, profissionalId]);

  async function fetchProfissionais() {
    try {
      const res = await getProfissionais();
      setProfissionais(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchDados() {
    setLoading(true);
    try {
      const res = await getRelatorioRemuneracao({ 
        inicio: dataInicio, 
        fim: dataFim, 
        profissionalId: profissionalId || undefined 
      });
      setDados(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarcarPago(ids, profId) {
    if (!ids?.length) return;
    setProcessingId(profId);
    try {
      await updateComissaoPaga({ ids, paga: true });
      toast.success('Comissões marcadas como pagas!');
      fetchDados();
    } catch (err) {
      toast.error('Erro ao atualizar status de pagamento');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  }

  // Agrupamento de Dados: Profissional -> Data
  const groupedData = useMemo(() => {
    return dados.reduce((acc, ag) => {
      const profId = ag.profissionalId;
      const profNome = ag.profissional?.nome || 'Sem Profissional';
      const dateKey = ag.data.split('T')[0];

      if (!acc[profId]) {
        acc[profId] = {
          id: profId,
          nome: profNome,
          fotoUrl: ag.profissional?.fotoUrl,
          pix: ag.profissional?.pix,
          metaMensal: ag.profissional?.metaMensal || 0,
          bonusMetaValor: ag.profissional?.bonusMetaValor || 0,
          bonusMetaPercent: ag.profissional?.bonusMetaPercent || 0,
          totalBruto: 0,
          totalComissao: 0,
          totalPendente: 0,
          bonusEstimado: 0,
          atendimentos: 0,
          dias: {}
        };
      }

      if (!acc[profId].dias[dateKey]) {
        acc[profId].dias[dateKey] = {
          data: dateKey,
          bruto: 0,
          comissao: 0,
          agendamentos: []
        };
      }

      const precoBase = ag.servico?.preco ?? ag.pacote?.preco ?? 0;
      const precoItens = ag.itens?.reduce((s, i) => s + (i.preco || 0), 0) || 0;
      const precoProdutos = ag.produtos?.reduce((s, i) => s + ((i.preco || 0) * (i.quantidade || 0)), 0) || 0;
      const totalAg = precoBase + precoItens + precoProdutos;

      acc[profId].totalBruto += totalAg;
      acc[profId].totalComissao += (ag.comissaoValor || 0);
      if (!ag.comissaoPaga) {
          acc[profId].totalPendente += (ag.comissaoValor || 0);
      }
      acc[profId].atendimentos += 1;

      acc[profId].dias[dateKey].bruto += totalAg;
      acc[profId].dias[dateKey].comissao += (ag.comissaoValor || 0);
      acc[profId].dias[dateKey].agendamentos.push(ag);

    Object.values(acc).forEach((prof) => {
      if (Number(prof.metaMensal || 0) > 0 && prof.totalBruto >= Number(prof.metaMensal || 0)) {
        prof.bonusEstimado = Number(prof.bonusMetaValor || 0) + ((prof.totalBruto * Number(prof.bonusMetaPercent || 0)) / 100);
      }
    });

    return acc;
  }, {});
  }, [dados]);

  const toggleProf = (id) => {
    setExpandedProfs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalComissaoGeral = dados.reduce((acc, curr) => acc + (curr.comissaoValor || 0), 0);
  const totalPendenteGeral = dados.reduce((acc, curr) => !curr.comissaoPaga ? acc + (curr.comissaoValor || 0) : acc, 0);
  const totalBrutoGeral = dados.reduce((acc, curr) => {
      const precoBase = curr.servico?.preco ?? curr.pacote?.preco ?? 0;
      const precoItens = curr.itens?.reduce((s, i) => s + (i.preco || 0), 0) || 0;
      const precoProdutos = curr.produtos?.reduce((s, i) => s + ((i.preco || 0) * (i.quantidade || 0)), 0) || 0;
      return acc + precoBase + precoItens + precoProdutos;
  }, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:p-6 border-b border-gray-100 dark:border-white/5 pb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-[#E29BA8]" />
            <p className="text-[9px] font-black text-[#E29BA8] uppercase tracking-[0.4em]">Conciliação Financeira</p>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-4">Remuneração & <span className="text-[#E29BA8]">Repasses</span></h1>
          <p className="text-gray-400 font-medium text-lg max-w-xl leading-relaxed">Conferência diária detalhada por profissional e cliente.</p>
        </div>

        <div className="flex items-center gap-4 relative z-10">
           <div className="flex flex-col items-end px-8 py-4 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pendente</span>
              <span className="text-3xl font-black text-bellapro-blush tracking-tighter">R$ {totalPendenteGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           </div>
           <div className="flex flex-col items-end px-8 py-4 bg-bellapro-ink text-white rounded-3xl shadow-xl">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Volume Bruto</span>
              <span className="text-2xl font-black tracking-tighter">R$ {totalBrutoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
           </div>
        </div>

        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#E29BA8]/10 blur-[120px] rounded-full -z-0" />
      </header>

      {/* Barra de Filtros Inteligente */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-gray-900/40 backdrop-blur-xl border border-gray-100 dark:border-white/5 p-4 sm:p-6 rounded-[2rem] shadow-lg flex flex-col md:flex-row items-center gap-4 sm:p-6">
           <div className="flex-1 w-full space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Início</label>
              <div className="relative group">
                 <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E29BA8] w-4 h-4 transition-transform group-hover:scale-110" />
                 <input 
                   type="date" 
                   value={dataInicio}
                   onChange={(e) => setDataInicio(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-[#E29BA8]/30 rounded-xl px-6 py-3 pl-12 text-xs font-black text-gray-700 dark:text-white outline-none transition-all shadow-inner"
                 />
              </div>
           </div>
           <div className="flex-1 w-full space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Fim</label>
              <div className="relative group">
                 <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E29BA8] w-4 h-4 transition-transform group-hover:scale-110" />
                 <input 
                   type="date" 
                   value={dataFim}
                   onChange={(e) => setDataFim(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-[#E29BA8]/30 rounded-xl px-6 py-3 pl-12 text-xs font-black text-gray-700 dark:text-white outline-none transition-all shadow-inner"
                 />
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-gray-900/40 backdrop-blur-xl border border-gray-100 dark:border-white/5 p-4 sm:p-6 rounded-[2rem] shadow-lg space-y-2">
           <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Talento</label>
           <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E29BA8] w-4 h-4 transition-transform group-hover:scale-110" />
              <select 
                disabled={role === 'profissional'}
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-[#E29BA8]/30 rounded-xl px-6 py-3 pl-12 text-xs font-black text-gray-700 dark:text-white outline-none appearance-none cursor-pointer transition-all shadow-inner"
              >
                <option value="">Todos os Talentos</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
           </div>
        </div>

        <button className="bg-bellapro-ink text-white rounded-[2rem] p-4 sm:p-6 shadow-xl flex flex-col items-center justify-center gap-2 hover:bg-[#d48997] transition-all group relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <Download size={24} className="text-[#E29BA8] group-hover:text-gray-900 dark:text-white transition-all transform group-hover:-translate-y-1" />
           <span className="text-[9px] font-black uppercase tracking-[0.2em] relative z-10">Exportar</span>
        </button>
      </section>

      {/* Lista de Conciliação por Profissional */}
      <div className="space-y-8">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 md:p-8">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-[#E29BA8]/20 border-t-[#E29BA8] rounded-full animate-spin" />
              <DollarSign className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#E29BA8] animate-pulse" size={32} />
            </div>
            <p className="text-sm font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Sincronizando registros financeiros...</p>
          </div>
        ) : Object.keys(groupedData).length === 0 ? (
          <div className="py-32 bg-white dark:bg-white/5 rounded-[4rem] border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center gap-4 sm:p-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-300">
               <Clock size={40} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Sem dados para conciliar</p>
              <p className="text-sm text-gray-400 font-medium italic">Nenhum atendimento finalizado no período selecionado.</p>
            </div>
          </div>
        ) : Object.values(groupedData).map((prof) => (
          <motion.div 
            layout
            key={prof.id}
            className="bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[3.5rem] border border-gray-100 dark:border-white/5 shadow-2xl overflow-hidden"
          >
            {/* Cabeçalho do Profissional */}
            <div 
              onClick={() => toggleProf(prof.id)}
              className="p-4 sm:p-6 flex flex-col md:flex-row justify-between items-center gap-4 sm:p-6 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl p-1 border-2 border-[#E29BA8]/20">
                      {prof.fotoUrl ? (
                        <img src={prof.fotoUrl} className="w-full h-full object-cover rounded-xl" alt={prof.nome} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-400 uppercase">
                           {prof.nome.substring(0,2)}
                        </div>
                      )}
                   </div>
                   <div className={cn(
                     "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center shadow-lg",
                     prof.totalPendente > 0 ? "bg-bellapro-blush" : "bg-[#E29BA8]"
                   )}>
                      {prof.totalPendente > 0 ? <AlertCircle size={10} className="text-gray-900 dark:text-white" /> : <CheckCircle2 size={10} className="text-gray-900 dark:text-white" />}
                   </div>
                </div>
                <div>
                   <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-1">{prof.nome}</h3>
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#d48997]/10 text-[#d48997] rounded-full text-[8px] font-black uppercase tracking-widest border border-[#d48997]/10">
                        <Users size={8} /> {prof.atendimentos} Atend.
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#E29BA8]/10 text-[#E29BA8] rounded-full text-[8px] font-black uppercase tracking-widest border border-[#E29BA8]/10">
                        <CalendarDays size={8} /> {Object.keys(prof.dias).length} Dias
                      </div>
                      {Number(prof.metaMensal || 0) > 0 && (
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                          prof.totalBruto >= Number(prof.metaMensal || 0)
                            ? "bg-[#E29BA8]/10 text-[#E29BA8] border-[#E29BA8]/10"
                            : "bg-bellapro-blush/10 text-bellapro-blush border-bellapro-blush/10"
                        )}>
                          <TrendingUp size={8} /> Meta {Math.round((prof.totalBruto / Number(prof.metaMensal || 1)) * 100)}%
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:p-6">
                 <div className="text-right">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">A Receber</p>
                    <p className={cn(
                        "text-2xl font-black tracking-tighter",
                        prof.totalPendente > 0 ? "text-bellapro-blush" : "text-[#E29BA8]"
                    )}>R$ {prof.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="w-px h-10 bg-gray-100 dark:bg-white/10" />
                 <div className={cn("transition-transform duration-500", expandedProfs[prof.id] ? "rotate-180" : "")}>
                    <ChevronDown className="text-gray-300" size={24} />
                 </div>
              </div>
            </div>

            {/* Conteúdo Detalhado (Agrupado por Dia) */}
            <AnimatePresence>
              {expandedProfs[prof.id] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-100 dark:border-white/5 overflow-hidden"
                >
                  <div className="p-4 md:p-8 space-y-8">
                    {Object.values(prof.dias).sort((a,b) => b.data.localeCompare(a.data)).map((dia) => (
                      <div key={dia.data} className="space-y-4">
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                           <div className="flex items-center gap-3">
                              <CalendarIcon className="text-[#E29BA8]" size={16} />
                              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                {format(parseISO(dia.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                              </span>
                           </div>
                           <div className="flex items-center gap-4 sm:p-6">
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Produção</span>
                                 <span className="text-xs font-black text-gray-900 dark:text-white tracking-tighter">R$ {dia.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black text-[#E29BA8] uppercase tracking-widest">Comissão</span>
                                 <span className="text-sm font-black text-[#E29BA8] tracking-tighter">R$ {dia.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                           </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-white/5">
                           <table className="w-full text-left">
                              <thead className="bg-white dark:bg-gray-800/50">
                                 <tr>
                                    <th className="px-6 py-3 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Horário</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Cliente</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Serviços</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Valor</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] text-right text-[#E29BA8]">Repasse</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                 {dia.agendamentos.map((ag) => {
                                   const pb = ag.servico?.preco ?? ag.pacote?.preco ?? 0;
                                   const pi = ag.itens?.reduce((s, i) => s + (i.preco || 0), 0) || 0;
                                   const pp = ag.produtos?.reduce((s, i) => s + ((i.preco || 0) * (i.quantidade || 0)), 0) || 0;
                                   const total = pb + pi + pp;
                                   
                                   return (
                                     <tr key={ag.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4">
                                           <div className="flex items-center gap-1.5">
                                              <Clock size={10} className="text-gray-300" />
                                              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{ag.inicioHora}</span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-4">
                                           <div className="flex flex-col">
                                              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-0.5">{ag.clienteNome}</span>
                                              <span className="text-[8px] font-medium text-gray-400">{ag.clienteTelefone}</span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-4">
                                           <div className="flex flex-col gap-0.5">
                                              <div className="flex items-center gap-1.5">
                                                 <div className="w-1 h-1 rounded-full bg-[#E29BA8]" />
                                                 <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{ag.servico?.nome || ag.pacote?.nome}</span>
                                              </div>
                                              {ag.itens?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 ml-2.5">
                                                   {ag.itens.map(i => (
                                                     <span key={i.id} className="text-[7px] font-black text-[#E29BA8]/70 uppercase tracking-tighter bg-[#E29BA8]/5 px-1.5 py-0.5 rounded-sm border border-[#E29BA8]/10">
                                                        {i.nome}
                                                     </span>
                                                   ))}
                                                </div>
                                              )}
                                           </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                           <span className="text-[10px] font-black text-gray-900 dark:text-white">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                           <div className="flex items-center justify-end gap-2">
                                              <span className="text-[11px] font-black text-[#E29BA8]">R$ {(ag.comissaoValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                              <CheckCircle2 size={12} className={cn(
                                                  "transition-colors",
                                                  ag.comissaoPaga ? "text-[#E29BA8]" : "text-gray-200 dark:text-white/10"
                                              )} />
                                           </div>
                                        </td>
                                      </tr>
                                   );
                                 })}
                              </tbody>
                           </table>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Rodapé do Profissional com Resumo Financeiro */}
                  <div className="bg-gray-50 dark:bg-white/[0.03] p-4 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 sm:p-6 border-t border-gray-100 dark:border-white/5">
                     <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-4 md:p-8">
                        <CreditCard className="text-gray-400" size={20} />
                        <div>
                           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Dados para Repasse (Pix)</p>
                           <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{prof.pix || 'Chave Pix não configurada'}</p>
                        </div>
                     </div>
                     <div className="hidden md:block">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Meta / Bônus estimado</p>
                        <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                          {Number(prof.metaMensal || 0) > 0
                            ? `Meta R$ ${Number(prof.metaMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Bônus R$ ${Number(prof.bonusEstimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : 'Meta não configurada'}
                        </p>
                     </div>
                     <button 
                        disabled={prof.totalPendente === 0 || processingId === prof.id}
                        onClick={() => handleMarcarPago(dados.filter(d => d.profissionalId === prof.id && !d.comissaoPaga).map(d => d.id), prof.id)}
                        className={cn(
                            "px-8 py-4 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2",
                            prof.totalPendente === 0 
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                : "bg-bellapro-ink text-white hover:bg-[#d48997]"
                        )}
                     >
                        {processingId === prof.id ? (
                            <RefreshIcon className="animate-spin" size={12} />
                        ) : prof.totalPendente === 0 ? (
                            <CheckCircle2 size={12} className="text-[#E29BA8]" />
                        ) : (
                            <CheckCircle2 size={12} className="text-[#E29BA8]" />
                        )}
                        {prof.totalPendente === 0 ? 'Tudo Pago' : 'Confirmar Repasse Total'}
                     </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
