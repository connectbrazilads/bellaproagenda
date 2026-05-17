import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Clock, 
  MoreHorizontal, 
  ArrowUpRight, 
  DollarSign,
  Users,
  CheckCircle,
  Zap,
  MessageSquare
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer 
} from 'recharts';
import { getAgendamentos, getClientes, getProfissionais, dispararIAProativa, dispararLembretes, updateStatusAgendamento, getDashboardExecutivo } from '../../services/api';
import { cn, formatDateInput } from '../../lib/utils';
import { Plus, UserPlus, ShoppingBag } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    hoje: [], 
    totalClientes: 0, 
    faturamentoHoje: 0, 
    concluidos: 0, 
    emAtendimento: 0,
    aguardando: 0,
    profissionaisAtivos: 0, 
    ocupacao: 0, 
    sparkline: [{ val: 0 }] 
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [executivo, setExecutivo] = useState({ cards: {}, produtividade: [], faturamentoPorCategoria: [], alertas: [] });
  const [loading, setLoading] = useState(true);
  const hojeStr = formatDateInput();

  const loadDashboard = async () => {
    try {
      const [ra, rc, rp, re] = await Promise.all([
        getAgendamentos({ data: hojeStr }),
        getClientes(),
        getProfissionais(),
        getDashboardExecutivo()
      ]);
      
      const ags = ra.data?.agendamentos || [];
      const profissionais = (rp.data || []).filter((prof) => prof.ativo);
      const concluidos = ags.filter(a => a.status === 'concluido');
      const emAtendimento = ags.filter(a => a.status === 'em_atendimento');
      const aguardando = ags.filter(a => a.status === 'confirmado'); // Se??o visual BellaPro

      const profissionaisComAgenda = new Set(ags.map((a) => a.profissionalId).filter(Boolean)).size;
      const minutosReservados = ags.reduce((acc, a) => {
        const base = Number(a.servico?.duracaoMin || a.pacote?.duracaoMin || 0);
        const extras = a.itens?.reduce((s, i) => s + Number(i.duracaoMin || 0), 0) || 0;
        return acc + base + extras;
      }, 0);
      const capacidadeDia = Math.max(profissionais.length, 1) * 9 * 60;
      const ocupacao = Math.min(100, Math.round((minutosReservados / capacidadeDia) * 100));
      const fatHoje = ags.reduce((acc, a) => {
        const base = Number(a.servico?.preco || a.pacote?.preco || 0);
        const extras = a.itens?.reduce((s, i) => s + Number(i.preco || 0), 0) || 0;
        return acc + base + extras;
      }, 0);
      const sparkline = ags
        .slice()
        .sort((a, b) => (a.inicioHora || '').localeCompare(b.inicioHora || ''))
        .map((a, index) => ({ val: index + 1 }));

      setStats({
        hoje: ags,
        totalClientes: rc.data?.length || 0,
        faturamentoHoje: fatHoje,
        concluidos: concluidos.length,
        emAtendimento: emAtendimento.length,
        aguardando: aguardando.length,
        profissionaisAtivos: profissionaisComAgenda || profissionais.length,
        ocupacao,
        sparkline: sparkline.length ? sparkline : [{ val: 0 }]
      });
      setExecutivo(re.data || { cards: {}, produtividade: [], faturamentoPorCategoria: [], alertas: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [hojeStr]);

  async function dispararIA() {
    if (!confirm('Deseja que a IA analise os clientes ausentes e envie convites automaticos?')) return;
    try {
      const res = await dispararIAProativa();
      alert(`${res.data.convitesEnviados} convites enviados com sucesso!`);
    } catch (e) {
      alert('Erro ao disparar IA.');
    }
  }

  async function handleLembretes() {
    if (!confirm('Deseja enviar lembretes para os clientes de hoje?')) return;
    try {
      const res = await dispararLembretes();
      alert(`${res.data.lembretesEnviados} lembretes enviados!`);
    } catch { alert('Erro ao disparar lembretes.'); }
  }

  async function updateAgendamentoStatus(ag, newStatus) {
    try {
      await updateStatusAgendamento(ag.id, newStatus);
      if (newStatus === 'concluido') {
        setCheckoutSuccess(ag);
      }
      await loadDashboard();
    } catch (e) {
      alert('Erro ao atualizar status.');
    }
  }

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-[#d48997] rounded-full animate-spin" />
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sincronizando BellaPro...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-12 pb-20"
    >
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:p-6 border-b border-gray-100 dark:border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(stats.profissionaisAtivos || 1, 3) }).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-950 bg-gray-200 overflow-hidden shadow-sm" />
              ))}
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{stats.profissionaisAtivos} profissionais com agenda hoje</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl xl:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-3">
            Performance <span className="text-[#d48997]">Geral</span>
          </h1>
          <p className="text-gray-400 font-medium text-xl max-w-xl leading-relaxed">Analítica estratégica em tempo real para o seu ecossistema de beleza.</p>
        </div>
        <div className="flex w-full lg:w-auto flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
           <motion.button 
             whileHover={{ scale: 1.05, y: -2 }}
             whileTap={{ scale: 0.95 }}
             onClick={dispararIA} 
             className="group relative bg-[#050505] text-white px-6 md:px-8 py-4 rounded-[1.75rem] font-black text-[10px] md:text-xs shadow-2xl overflow-hidden transition-all"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
             <span className="relative z-10 flex items-center gap-3">
               <Zap className="w-4 h-4 text-emerald-400" /> IA PROATIVA
             </span>
           </motion.button>
           <motion.button 
             whileHover={{ scale: 1.05, y: -2 }}
             whileTap={{ scale: 0.95 }}
             onClick={handleLembretes} 
             className="bg-white dark:bg-white/5 text-gray-900 dark:text-white border border-gray-100 dark:border-white/10 px-6 md:px-8 py-4 rounded-[1.75rem] font-black text-[10px] md:text-xs shadow-xl transition-all flex items-center justify-center gap-3"
           >
             <Calendar className="w-4 h-4 text-[#d48997]" /> LEMBRETES
           </motion.button>
        </div>
      </header>

      {/* Se??o BellaPro */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 bg-white dark:bg-gray-900/40 backdrop-blur-3xl p-4 sm:p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 flex flex-col justify-center gap-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Monitor de Piso</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Status em Tempo Real</h3>
        </div>
        <div className="flex items-center gap-4 p-4 sm:p-6 bg-amber-50 dark:bg-amber-500/10 rounded-[2rem] border border-amber-100 dark:border-amber-500/20">
           <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Clock size={20} />
           </div>
           <div>
              <p className="text-[20px] font-black text-amber-600 leading-none">{stats.aguardando}</p>
              <p className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest mt-1">Aguardando Início</p>
           </div>
        </div>
        <div className="flex items-center gap-4 p-4 sm:p-6 bg-[#E29BA8]/5 dark:bg-[#E29BA8]/10 rounded-[2rem] border border-[#E29BA8]/10 dark:border-[#E29BA8]/20">
           <div className="w-12 h-12 bg-[#E29BA8] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#E29BA8]/20">
              <TrendingUp size={20} />
           </div>
           <div>
              <p className="text-[20px] font-black text-[#d48997] leading-none">{stats.emAtendimento}</p>
              <p className="text-[9px] font-black text-[#b96a79]/60 uppercase tracking-widest mt-1">Em Atenção</p>
           </div>
        </div>
        <div className="flex items-center gap-4 p-4 sm:p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20">
           <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle size={20} />
           </div>
           <div>
              <p className="text-[20px] font-black text-emerald-600 leading-none">{stats.concluidos}</p>
              <p className="text-[9px] font-black text-emerald-700/60 uppercase tracking-widest mt-1">Concluídos Hoje</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:p-6">
        <StatCard label="Agendamentos Hoje" value={stats.hoje.length} icon={<Calendar />} color="purple" sparkline={stats.sparkline} />
        <StatCard label="Concluídos" value={stats.concluidos} icon={<CheckCircle />} color="emerald" />
        <StatCard label="Faturamento Hoje" value={`R$ ${Number(stats.faturamentoHoje || 0).toFixed(0)}`} icon={<DollarSign />} color="blue" sparkline={stats.sparkline} />
        <StatCard label="Clientes na Base" value={stats.totalClientes} icon={<Users />} color="orange" sparkline={stats.sparkline} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <MiniExecCard label="Ticket médio" value={`R$ ${Number(executivo.cards?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
        <MiniExecCard label="Cancelados" value={executivo.cards?.cancelados || 0} tone="rose" />
        <MiniExecCard label="No-show" value={executivo.cards?.noShows || 0} tone="amber" />
        <MiniExecCard label="Retorno" value={`${executivo.cards?.retornoTaxa || 0}%`} tone="emerald" />
        <MiniExecCard label="Baixo estoque" value={executivo.cards?.baixoEstoque || 0} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:p-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">Próximos do Dia</h2>
            <button onClick={() => navigate('/admin/agenda')} className="text-[10px] font-black text-[#d48997] uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
              Ver Agenda <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[3rem] border border-gray-100 dark:border-white/5 overflow-hidden divide-y divide-gray-50 dark:divide-white/5 shadow-2xl shadow-gray-200/20 dark:shadow-none">
            {stats.hoje.length === 0 ? (
              <div className="p-32 text-center">
                <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Calendar className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                </div>
                <p className="text-gray-300 dark:text-gray-700 font-black uppercase tracking-[0.3em] text-[10px]">Silênao na Agenda</p>
              </div>
            ) : (
              (stats.hoje || []).sort((a,b) => (a.inicioHora || '').localeCompare(b.inicioHora || '')).map((a, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={a.id}
                  onClick={() => navigate('/admin/agenda')}
                  className="p-4 sm:p-6 md:p-8 xl:p-10 flex flex-col xl:flex-row items-start xl:items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group cursor-pointer gap-4 sm:p-6"
                >
                  <div className="flex items-center gap-4 md:gap-4 sm:p-6 xl:gap-5 md:p-10 w-full min-w-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 dark:bg-gray-800 rounded-[2rem] md:rounded-[2rem] flex flex-col items-center justify-center border border-gray-100 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:scale-105 transition-all shadow-sm shrink-0">
                      <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{a.inicioHora}</span>
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Hórario</span>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg md:text-xl xl:text-2xl leading-none truncate">{a.clienteNome}</h4>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      </div>
                      <p className="text-xs text-gray-500 font-bold flex flex-wrap items-center gap-2">
                        <span className="text-[#d48997] bg-[#d48997]/10 px-3 py-1 rounded-lg uppercase tracking-widest text-[10px]">{a.servico?.nome || a.pacote?.nome}</span>
                        <span className="opacity-40">com</span> 
                        <span className="text-gray-900 dark:text-gray-200">{a.profissional?.nome}</span>
                      </p>
                    </div>
                  </div>
                                <div className="flex flex-col items-end gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="text-right w-full xl:w-auto">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 hidden xl:block">Status & Fluxo</p>
                       <div className="flex items-center justify-end gap-2 w-full">
                         {a.status === 'confirmado' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateAgendamentoStatus(a, 'em_atendimento'); }} 
                              className="flex-1 xl:flex-none px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#d48997] text-white hover:bg-[#b96a79] transition-all shadow-lg shadow-[#E29BA8]/20 flex items-center justify-center gap-2"
                            >
                              <TrendingUp size={14} /> Iniciar
                            </button>
                         )}
                         {a.status === 'em_atendimento' && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); updateAgendamentoStatus(a, 'concluido'); }} 
                             className="flex-1 xl:flex-none px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                           >
                             <CheckCircle size={14} /> Finalizar
                           </button>
                         )}
                         {a.status === 'concluido' && (
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const total = (Number(a.servico?.preco || a.pacote?.preco || 0) + (a.itens?.reduce((s,i) => s + i.preco, 0) || 0) + (a.produtos?.reduce((s,p) => s + (p.preco * p.quantidade), 0) || 0));
                                const itensArr = [
                                  a.servico?.nome || a.pacote?.nome,
                                  ...(a.itens?.map(i => i.servico?.nome) || []),
                                  ...(a.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                                ].filter(Boolean);
                                const itensStr = itensArr.join(', ');
                                
                                const msg = encodeURIComponent(
                                  `*REENVIO DE COMPROVANTE*\n\n` +
                                  `Ol?, *${a.clienteNome}*!\n` +
                                  `Segue o seu comprovante de atendimento.\n\n` +
                                  `*Detalhes:*\n${itensStr}\n` +
                                  `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                                  `Agradecemos a prefer?ncia! �S�`
                                );
                                window.open(`https://wa.me/55${a.clienteTelefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                              }} 
                              className="flex-1 xl:flex-none px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-[#25D366] hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                              <MessageSquare size={14} /> Reenviar Recibo
                            </button>
                         )}
                         <span className={cn(
                           "flex-1 xl:flex-none px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center text-center font-black",
                           a.status === 'concluido' && 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/10',
                           a.status === 'em_atendimento' && 'bg-[#E29BA8]/5 dark:bg-[#E29BA8]/10 text-[#d48997] dark:text-[#efbac2] border-[#E29BA8]/10 dark:border-[#E29BA8]/20',
                           a.status === 'confirmado' && 'bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/5'
                         )}>
                           {a.status === 'concluido' ? 'FINALIZADO' : a.status === 'em_atendimento' ? 'EM ATENDIMENTO' : 'AGUARDANDO'}
                         </span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">Insights de IA</h2>
          <motion.div 
            whileHover={{ y: -5 }}
            className="relative bg-[#0a0a0a] rounded-[2rem] p-5 md:p-10 text-white shadow-2xl overflow-hidden group"
          >
             <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#d48997]/20 blur-[80px] rounded-full group-hover:bg-[#d48997]/30 transition-colors" />
             
             <div className="relative z-10">
               <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 border border-gray-200 dark:border-white/10">
                  <Zap className="w-7 h-7 text-amber-400 animate-pulse" />
               </div>
               <h3 className="text-2xl font-black mb-3 tracking-tight">Análise Preditiva</h3>
               <p className="text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                 A IA pode analisar sua base atual e disparar convites para clientes sem retorno recente, com foco em preencher os horários mes vazios.
               </p>
               <button 
                 onClick={dispararIA} 
                 className="w-full py-5 bg-gradient-to-r from-[#d48997] to-indigo-600 text-white rounded-2xl font-black text-xs hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest shadow-xl shadow-[#E29BA8]/20"
               >
                 Otimizar Retenção
               </button>
             </div>
          </motion.div>

          <div className="bg-white rounded-[2rem] p-4 md:p-8 border border-gray-100 shadow-xl shadow-gray-200/20">
             <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Taxa de Ocupação</p>
                <span className="text-emerald-500 font-black text-xs">{stats.ocupacao}%</span>
             </div>
             <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.ocupacao}%` }}
                  className="h-full bg-emerald-500" 
                />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:p-6">
        <div className="bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[2rem] p-4 md:p-8 border border-gray-100 dark:border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Produtividade por profissional</h3>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Período executivo</span>
          </div>
          <div className="space-y-3">
            {(executivo.produtividade || []).slice(0, 6).map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-gray-100 dark:border-white/5 px-4 py-4">
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{item.nome}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">{item.atendimentos} atendimentos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#d48997]">R$ {Number(item.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] font-black text-emerald-500">Com. R$ {Number(item.comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[2rem] p-4 md:p-8 border border-gray-100 dark:border-white/5 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Faturamento por categoria</h3>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Equipe</span>
          </div>
          <div className="space-y-3">
            {(executivo.faturamentoPorCategoria || []).slice(0, 6).map((item) => (
              <div key={item.nome} className="rounded-2xl border border-gray-100 dark:border-white/5 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-black text-gray-900 dark:text-white">{item.nome}</p>
                  <p className="text-sm font-black text-blue-600">R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[2rem] border border-gray-100 dark:border-white/5 px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Alertas executivos</p>
              <span className="text-xs font-black text-[#d48997]">{executivo.alertas?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(executivo.alertas?.length ? executivo.alertas : [{ nome: 'Sem alertas críticos', estoque: '-' }]).map((alerta, index) => (
                <div key={`${alerta.nome}-${index}`} className="rounded-2xl bg-gray-50 dark:bg-white/5 px-4 py-3">
                  <p className="text-sm font-black text-gray-900 dark:text-white">{alerta.nome}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                    {alerta.estoque === '-' ? 'Opera??o estável' : `Estoque em ${alerta.estoque} unidade(s)`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {checkoutSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-[3rem] p-5 md:p-10 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">Atenção Finalizado!</h3>
            <p className="text-gray-500 text-sm mb-10 font-medium">O status foi atualizado e as comissões foram geradas com sucesso.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  const total = (Number(checkoutSuccess.servico?.preco || checkoutSuccess.pacote?.preco || 0) + (checkoutSuccess.itens?.reduce((s,i) => s + i.preco, 0) || 0) + (checkoutSuccess.produtos?.reduce((s,p) => s + (p.preco * p.quantidade), 0) || 0));
                  const itensArr = [
                    checkoutSuccess.servico?.nome || checkoutSuccess.pacote?.nome,
                    ...(checkoutSuccess.itens?.map(i => i.servico?.nome) || []),
                    ...(checkoutSuccess.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                  ].filter(Boolean);
                  const itensStr = itensArr.join(', ');
                  
                  const msg = encodeURIComponent(
                    `*COMPROVANTE DE ATENDIMENTO*\n\n` +
                    `Ol?, *${checkoutSuccess.clienteNome}*!\n` +
                    `Seu atendimento foi finalizado com sucesso.\n\n` +
                    `*Detalhes:*\n${itensStr}\n` +
                    `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                    `Agradecemos a prefer?ncia! �S�`
                  );
                  window.open(`https://wa.me/55${checkoutSuccess.clienteTelefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                  setCheckoutSuccess(null);
                }}
                className="w-full py-5 rounded-[2rem] bg-[#25D366] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 hover:scale-[1.02] transition-all"
              >
                <TrendingUp size={16} className="rotate-90" /> Enviar Comprovante WhatsApp
              </button>
              <button 
                onClick={() => setCheckoutSuccess(null)}
                className="w-full py-5 rounded-[2rem] bg-gray-100 dark:bg-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon, color, trend, sparkline }) {
  const colors = {
    purple: "bg-[#E29BA8]/5 text-[#d48997] border-[#E29BA8]/10",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.01 }}
      className="bg-white dark:bg-gray-900/40 backdrop-blur-2xl p-4 sm:p-6 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2rem] xl:rounded-[3rem] shadow-2xl shadow-gray-200/20 dark:shadow-none border border-gray-100 dark:border-white/5 relative overflow-hidden group"
    >
       <div className="flex justify-between items-start mb-8">
          <div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] flex items-center justify-center text-3xl border shadow-inner transition-all group-hover:rotate-6", colors[color])}>
            {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
              <ArrowUpRight className="w-3 h-3" /> {trend}
            </span>
          )}
       </div>

       <div className="space-y-1 mb-10">
          <p className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none break-words">{value}</p>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mt-3">{label}</p>
       </div>

       <div className="h-16 w-full -mb-2">
          <ResponsiveContainer width="100%" height="100%">
             <LineChart data={sparkline?.length ? sparkline : [{ val: 0 }]}>
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke={color === 'purple' ? '#9333ea' : color === 'emerald' ? '#10b981' : color === 'blue' ? '#2563eb' : '#f97316'} 
                  strokeWidth={4} 
                  dot={false} 
                />
             </LineChart>
          </ResponsiveContainer>
       </div>
    </motion.div>
  );
}

function MiniExecCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-gray-100 dark:border-white/5 text-gray-900 dark:text-white',
    rose: 'border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-300',
    amber: 'border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-300',
    emerald: 'border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300',
    blue: 'border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-300',
  };

  return (
    <div className={`rounded-[1.75rem] border bg-white dark:bg-gray-900/40 px-5 py-5 shadow-lg ${tones[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-black tracking-tighter">{value}</p>
    </div>
  );
}
