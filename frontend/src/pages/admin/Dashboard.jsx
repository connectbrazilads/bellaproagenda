import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  Clock, 
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
import { getAgendamentos, getClientes, getProfissionais, dispararIAProativa, dispararLembretes, updateStatusAgendamento, getDashboardExecutivo, getResumoFaturasSalao } from '../../services/api';
import { calculateAgendamentoDuration, calculateAgendamentoTotal, cn, formatDateInput, getAgendamentoItensExtras } from '../../lib/utils';
import { Plus, UserPlus, ShoppingBag, CreditCard, AlertTriangle } from 'lucide-react';
import useElementWidth from '../../hooks/useElementWidth';

export default function Dashboard() {
  const pageRef = useRef(null);
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
  const [billingResumo, setBillingResumo] = useState({ abertas: 0, vencidas: 0, totalPendencias: 0, temPendencia: false, proxima: null });
  const [loading, setLoading] = useState(true);
  const hojeStr = formatDateInput();
  const pageWidth = useElementWidth(pageRef, typeof window !== 'undefined' ? window.innerWidth : 1440);
  const isCompactPage = pageWidth < 1380;
  const showWideStatusGrid = pageWidth >= 1480;
  const showThreePanelLayout = pageWidth >= 1420;
  const showDualInsights = pageWidth >= 1280;

  const loadDashboard = async () => {
    try {
      const [ra, rc, rp, re, rf] = await Promise.all([
        getAgendamentos({ data: hojeStr }),
        getClientes(),
        getProfissionais(),
        getDashboardExecutivo(),
        getResumoFaturasSalao().catch(() => ({ data: { abertas: 0, vencidas: 0, totalPendencias: 0, temPendencia: false, proxima: null } })),
      ]);
      
      const ags = ra.data?.agendamentos || [];
      const profissionais = (rp.data || []).filter((prof) => prof.ativo);
      const concluidos = ags.filter(a => a.status === 'concluido');
      const emAtendimento = ags.filter(a => a.status === 'em_atendimento');
      const aguardando = ags.filter(a => a.status === 'confirmado'); 

      const profissionaisComAgenda = new Set(ags.map((a) => a.profissionalId).filter(Boolean)).size;
      const minutosReservados = ags.reduce((acc, a) => {
        return acc + calculateAgendamentoDuration(a);
      }, 0);
      const capacidadeDia = Math.max(profissionais.length, 1) * 9 * 60;
      const ocupacao = Math.min(100, Math.round((minutosReservados / capacidadeDia) * 100));
      const fatHoje = ags.reduce((acc, a) => acc + calculateAgendamentoTotal(a), 0);
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
      setBillingResumo(rf.data || { abertas: 0, vencidas: 0, totalPendencias: 0, temPendencia: false, proxima: null });
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
    if (!confirm('Deseja que a IA analise os clientes ausentes e envie convites automáticos?')) return;
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
      <div className="w-10 h-10 border-4 border-gray-100 border-t-[#d48997] rounded-full animate-spin" />
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Sincronizando BellaPro...</p>
    </div>
  );

  return (
    <motion.div 
      ref={pageRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8 pb-20 px-4"
    >
      <header className={cn(
        'flex flex-col justify-between items-start gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6',
        !isCompactPage && 'lg:flex-row lg:items-center'
      )}>
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full tracking-wide">{stats.profissionaisAtivos} profissionais ativos hoje</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Performance <span className="text-[#d48997]">Geral</span>
          </h1>
          <p className="text-gray-455 dark:text-gray-400 text-sm max-w-xl leading-relaxed">Analítica estratégica em tempo real para o seu ecossistema de beleza.</p>
        </div>
        <div className="flex w-full lg:w-auto flex-wrap items-center gap-3">
           <motion.button 
             whileHover={{ scale: 1.02, y: -1 }}
             whileTap={{ scale: 0.98 }}
             onClick={dispararIA} 
             className="group relative bg-gray-950 dark:bg-white text-white dark:text-gray-950 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm overflow-hidden transition-all flex items-center justify-center gap-2"
           >
             <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
             <span>IA Proativa</span>
           </motion.button>
           <motion.button 
             whileHover={{ scale: 1.02, y: -1 }}
             whileTap={{ scale: 0.98 }}
             onClick={handleLembretes} 
             className="bg-white dark:bg-white/5 text-gray-905 dark:text-white border border-black/[0.06] dark:border-white/10 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
           >
             <Calendar className="w-4 h-4 text-[#d48997]" />
             <span>Enviar Lembretes</span>
           </motion.button>
        </div>
      </header>

      {billingResumo.temPendencia ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
                {billingResumo.vencidas > 0 ? <AlertTriangle size={20} /> : <CreditCard size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200">Financeiro SaaS</p>
                <h3 className="mt-1.5 text-lg font-semibold text-white">
                  {billingResumo.vencidas > 0 ? 'Fatura vencida aguardando pagamento.' : 'Fatura em aberto aguardando pagamento.'}
                </h3>
                <p className="mt-1.5 text-sm text-white/80">
                  Você possui {billingResumo.totalPendencias} pendência(s) financeira(s).
                  {billingResumo.proxima ? ` Próximo vencimento em ${new Date(billingResumo.proxima.vencimento).toLocaleDateString('pt-BR')}.` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/faturas')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#d48997] px-5 py-2.5 text-xs font-semibold shadow-sm hover:bg-gray-50 transition-all"
            >
              <span>Ver faturas</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Monitor de Piso */}
      <div className={cn('grid gap-4', showWideStatusGrid ? 'lg:grid-cols-4' : 'md:grid-cols-2')}>
        <div className={cn('bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] flex flex-col justify-center gap-1', showWideStatusGrid && 'lg:col-span-1')}>
          <p className="text-[10px] font-semibold text-[#d48997] uppercase tracking-wide">Monitor de Piso</p>
          <h3 className="text-lg font-serif font-normal text-gray-905 dark:text-white">Status em Tempo Real</h3>
        </div>
        <div className="flex items-center gap-4 p-4.5 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] rounded-2xl border border-amber-500/10">
           <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} />
           </div>
           <div>
              <p className="text-xl font-bold text-amber-600 leading-none tabular-nums">{stats.aguardando}</p>
              <p className="text-[10px] font-medium text-amber-700/60 dark:text-amber-400/60 tracking-wide mt-1">Aguardando Início</p>
           </div>
        </div>
        <div className="flex items-center gap-4 p-4.5 bg-[#E29BA8]/5 dark:bg-[#E29BA8]/10 rounded-2xl border border-[#E29BA8]/10">
           <div className="w-10 h-10 bg-[#E29BA8]/10 text-[#d48997] rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
           </div>
           <div>
              <p className="text-xl font-bold text-[#d48997] leading-none tabular-nums">{stats.emAtendimento}</p>
              <p className="text-[10px] font-medium text-[#b96a79]/60 dark:text-[#efbac2]/60 tracking-wide mt-1">Em Atendimento</p>
           </div>
        </div>
        <div className="flex items-center gap-4 p-4.5 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] rounded-2xl border border-emerald-500/10">
           <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={18} />
           </div>
           <div>
              <p className="text-xl font-bold text-emerald-600 leading-none tabular-nums">{stats.concluidos}</p>
              <p className="text-[10px] font-medium text-emerald-700/60 dark:text-emerald-400/60 tracking-wide mt-1">Concluídos Hoje</p>
           </div>
        </div>
      </div>

      <div className={cn('grid gap-4', showWideStatusGrid ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2')}>
        <StatCard label="Agendamentos Hoje" value={stats.hoje.length} icon={<Calendar />} color="purple" sparkline={stats.sparkline} />
        <StatCard label="Concluídos" value={stats.concluidos} icon={<CheckCircle />} color="emerald" />
        <StatCard label="Faturamento Hoje" value={`R$ ${Number(stats.faturamentoHoje || 0).toFixed(0)}`} icon={<DollarSign />} color="blue" sparkline={stats.sparkline} />
        <StatCard label="Clientes na Base" value={stats.totalClientes} icon={<Users />} color="orange" sparkline={stats.sparkline} />
      </div>

      <div className={cn('grid gap-4', showWideStatusGrid ? 'grid-cols-2 xl:grid-cols-5' : 'grid-cols-2 lg:grid-cols-3')}>
        <MiniExecCard label="Ticket Médio" value={`R$ ${Number(executivo.cards?.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
        <MiniExecCard label="Cancelados" value={executivo.cards?.cancelados || 0} tone="rose" />
        <MiniExecCard label="No-Show" value={executivo.cards?.noShows || 0} tone="amber" />
        <MiniExecCard label="Taxa de Retorno" value={`${executivo.cards?.retornoTaxa || 0}%`} tone="emerald" />
        <MiniExecCard label="Baixo Estoque" value={executivo.cards?.baixoEstoque || 0} tone="blue" />
      </div>

      <div className={cn('grid grid-cols-1 gap-6', showThreePanelLayout ? 'lg:grid-cols-3' : 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
        <div className={cn('space-y-4', showThreePanelLayout && 'lg:col-span-2')}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-505 uppercase tracking-wider">Próximos do Dia</h2>
            <button onClick={() => navigate('/admin/agenda')} className="text-xs font-semibold text-[#d48997] flex items-center gap-1 hover:gap-1.5 transition-all">
              <span>Ver Agenda</span> 
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-black/[0.04] dark:border-white/[0.04] overflow-hidden divide-y divide-black/[0.03] dark:divide-white/5 shadow-sm">
            {stats.hoje.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-black/[0.04] dark:border-white/5">
                  <Calendar className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 dark:text-gray-500 font-medium text-xs">Silêncio na agenda por hoje.</p>
              </div>
            ) : (
              (stats.hoje || []).sort((a,b) => (a.inicioHora || '').localeCompare(b.inicioHora || '')).map((a, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={a.id}
                  onClick={() => navigate('/admin/agenda')}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all group cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-4 w-full min-w-0">
                    <div className="w-16 h-16 bg-gradient-to-tr from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 rounded-xl flex flex-col items-center justify-center border border-black/[0.04] dark:border-white/5 group-hover:bg-white dark:group-hover:bg-white/5 transition-all shadow-sm shrink-0">
                      <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">{a.inicioHora}</span>
                      <span className="text-[8px] font-semibold text-gray-405 dark:text-gray-550 uppercase tracking-widest mt-0.5">Horário</span>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-base leading-tight truncate normal-case">{a.clienteNome}</h4>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shrink-0" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex flex-wrap items-center gap-1.5">
                        <span className="text-[#d48997] bg-[#d48997]/10 px-2.5 py-0.5 rounded-lg text-[10px] tracking-wide">{a.servico?.nome || a.pacote?.nome}</span>
                        <span className="opacity-50 font-normal">com</span> 
                        <span className="text-gray-805 dark:text-gray-200">{a.profissional?.nome}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
                     {a.status === 'confirmado' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateAgendamentoStatus(a, 'em_atendimento'); }} 
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-[#d48997] hover:bg-[#c97b8a] text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <TrendingUp size={14} /> <span>Iniciar</span>
                        </button>
                     )}
                     {a.status === 'em_atendimento' && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); updateAgendamentoStatus(a, 'concluido'); }} 
                         className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
                       >
                         <CheckCircle size={14} /> <span>Finalizar</span>
                       </button>
                     )}
                     {a.status === 'concluido' && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const total = calculateAgendamentoTotal(a);
                            const itensArr = [
                              a.servico?.nome || a.pacote?.nome,
                              ...getAgendamentoItensExtras(a).map((i) => i.servico?.nome || i.nome),
                              ...(a.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                            ].filter(Boolean);
                            const itensStr = itensArr.join(', ');
                            
                            const msg = encodeURIComponent(
                              `*REENVIO DE COMPROVANTE*\n\n` +
                              `Olá, *${a.clienteNome}*!\n` +
                              `Segue o seu comprovante de atendimento.\n\n` +
                              `*Detalhes:*\n${itensStr}\n` +
                              `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                              `Agradecemos a preferência!`
                            );
                            window.open(`https://wa.me/55${a.clienteTelefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                          }} 
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare size={14} /> <span>Recibo</span>
                        </button>
                     )}
                     <span className={cn(
                       "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold border transition-all text-center",
                       a.status === 'concluido' && 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
                       a.status === 'em_atendimento' && 'bg-[#E29BA8]/5 text-[#d48997] border-[#E29BA8]/15',
                       a.status === 'confirmado' && 'bg-gray-50/50 dark:bg-white/[0.02] text-gray-400 border-black/[0.04] dark:border-white/5'
                     )}>
                       {a.status === 'concluido' ? 'Finalizado' : a.status === 'em_atendimento' ? 'Em Agenda' : 'Aguardando'}
                     </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-505 uppercase tracking-wider">Insights de IA</h2>
          <motion.div 
            whileHover={{ y: -2 }}
            className="relative bg-gray-950 dark:bg-[#0c0c0e] rounded-2xl p-6 md:p-8 text-white border border-black/[0.04] dark:border-white/10 shadow-sm overflow-hidden group"
          >
             <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#d48997]/15 blur-[60px] rounded-full group-hover:bg-[#d48997]/25 transition-colors duration-500" />
             
             <div className="relative z-10">
               <div className="w-11 h-11 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center mb-6 border border-white/10">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
               </div>
               <h3 className="text-lg font-serif font-normal mb-2 tracking-wide text-white">Análise Preditiva</h3>
               <p className="text-gray-400 text-xs leading-relaxed mb-6 font-medium">
                 A IA pode analisar sua base atual e disparar convites para clientes ausentes, com foco em preencher os horários mais vazios da semana.
               </p>
               <button 
                 onClick={dispararIA} 
                 className="w-full py-3 bg-[#d48997] hover:bg-[#c97b8a] text-white rounded-xl font-semibold text-xs transition-all uppercase tracking-wider shadow-sm hover:shadow"
               >
                 Otimizar Retenção
               </button>
             </div>
          </motion.div>

          <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Taxa de Ocupação</p>
                <span className="text-emerald-500 font-semibold text-xs">{stats.ocupacao}%</span>
             </div>
             <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${stats.ocupacao}%` }}
                   className="h-full bg-emerald-500" 
                />
             </div>
          </div>
        </div>
      </div>

      <div className={cn('grid gap-6', showDualInsights && 'xl:grid-cols-2')}>
        <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 md:p-6 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-gray-905 dark:text-white">Produtividade por Profissional</h3>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Mensal</span>
          </div>
          <div className="space-y-2.5">
            {(executivo.produtividade || []).slice(0, 6).map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-black/[0.03] dark:border-white/[0.03] bg-white dark:bg-white/[0.01] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white normal-case">{item.nome}</p>
                  <p className="text-[10px] font-medium text-gray-405 dark:text-gray-500 mt-0.5">{item.atendimentos} atendimentos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#d48997]">R$ {Number(item.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] font-medium text-emerald-500">Comissão R$ {Number(item.comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl p-5 md:p-6 border border-black/[0.04] dark:border-white/[0.04] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-905 dark:text-white">Faturamento por Categoria</h3>
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Geral</span>
            </div>
            <div className="space-y-2.5">
              {(executivo.faturamentoPorCategoria || []).slice(0, 4).map((item) => (
                <div key={item.nome} className="rounded-xl border border-black/[0.03] dark:border-white/[0.03] bg-white dark:bg-white/[0.01] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white normal-case">{item.nome}</p>
                    <p className="text-sm font-semibold text-[#d48997] tabular-nums">R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-white/[0.01] px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-405 dark:text-gray-500">Alertas Operacionais</p>
              <span className="text-xs font-semibold text-[#d48997]">{executivo.alertas?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(executivo.alertas?.length ? executivo.alertas : [{ nome: 'Nenhum alerta crítico', estoque: '-' }]).map((alerta, index) => (
                <div key={`${alerta.nome}-${index}`} className="rounded-xl bg-white dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] px-4 py-2.5">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white normal-case">{alerta.nome}</p>
                  <p className="text-[10px] font-medium text-gray-405 dark:text-gray-500 mt-0.5">
                    {alerta.estoque === '-' ? 'Estabilidade operacional' : `Estoque mínimo: ${alerta.estoque} unidades`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {checkoutSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain p-3 bg-black/60 backdrop-blur-sm sm:p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-xl border border-black/[0.04] dark:bg-gray-900 dark:border-white/10 md:p-8"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-serif font-normal text-gray-900 dark:text-white mb-2">Atendimento Concluído</h3>
            <p className="text-gray-405 dark:text-gray-400 text-xs mb-8">As atualizações foram consolidadas e as comissões devidamente registradas.</p>
            
            <div className="space-y-2">
              <button 
                onClick={() => {
                  const total = calculateAgendamentoTotal(checkoutSuccess);
                  const itensArr = [
                    checkoutSuccess.servico?.nome || checkoutSuccess.pacote?.nome,
                    ...getAgendamentoItensExtras(checkoutSuccess).map((i) => i.servico?.nome || i.nome),
                    ...(checkoutSuccess.produtos?.map(p => `${p.quantidade}x ${p.produto?.nome}`) || [])
                  ].filter(Boolean);
                  const itensStr = itensArr.join(', ');
                  
                  const msg = encodeURIComponent(
                    `*COMPROVANTE DE ATENDIMENTO*\n\n` +
                    `Olá, *${checkoutSuccess.clienteNome}*!\n` +
                    `Seu atendimento foi finalizado com sucesso.\n\n` +
                    `*Detalhes:*\n${itensStr}\n` +
                    `*Valor Total:* R$ ${total.toFixed(2)}\n\n` +
                    `Agradecemos a preferência!`
                  );
                  window.open(`https://wa.me/55${checkoutSuccess.clienteTelefone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                  setCheckoutSuccess(null);
                }}
                className="w-full py-3.5 rounded-xl bg-[#25D366] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/10 hover:scale-[1.01] transition-all"
              >
                <TrendingUp size={14} className="rotate-90" /> Enviar Comprovante WhatsApp
              </button>
              <button 
                onClick={() => setCheckoutSuccess(null)}
                className="w-full py-3.5 rounded-xl bg-gray-50 border border-black/[0.04] text-gray-500 hover:bg-gray-100 dark:bg-white/5 dark:border-white/5 dark:text-white/70 dark:hover:bg-white/10 transition-all font-semibold text-xs"
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
    purple: "bg-[#e29ba8]/10 text-[#d48997] border-[#e29ba8]/20",
    emerald: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
    blue: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20",
    orange: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.01 }}
      className="bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 rounded-2xl shadow-sm border border-black/[0.04] dark:border-white/[0.04] relative overflow-hidden group transition-all duration-300 hover:border-[#e29ba8]/30 dark:hover:border-[#e29ba8]/20"
    >
       <div className="flex justify-between items-start mb-6">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-all group-hover:rotate-6", colors[color])}>
            {React.cloneElement(icon, { size: 20, strokeWidth: 2 })}
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <ArrowUpRight className="w-3 h-3" /> {trend}
            </span>
          )}
       </div>

       <div className="space-y-1 mb-6">
          <p className="text-2xl font-semibold text-gray-905 dark:text-white tracking-tight leading-none break-words tabular-nums">{value}</p>
          <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wide mt-2 normal-case">{label}</p>
       </div>

       <div className="h-10 w-full opacity-60 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
             <LineChart data={sparkline?.length ? sparkline : [{ val: 0 }]}>
                <Line 
                   type="monotone" 
                   dataKey="val" 
                   stroke={color === 'purple' ? '#d48997' : color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#f97316'} 
                   strokeWidth={3} 
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
    default: 'border-black/[0.04] dark:border-white/[0.04] text-gray-900 dark:text-white',
    rose: 'border-rose-250/20 text-[#d48997] bg-rose-500/[0.02]',
    amber: 'border-amber-250/20 text-amber-600 bg-amber-500/[0.02]',
    emerald: 'border-emerald-250/20 text-emerald-600 bg-emerald-500/[0.02]',
    blue: 'border-blue-250/20 text-blue-600 bg-blue-500/[0.02]',
  };

  return (
    <div className={`rounded-xl border bg-white/60 dark:bg-white/[0.02] backdrop-blur-md px-5 py-4 shadow-sm transition-all duration-300 hover:border-[#e29ba8]/20 ${tones[tone]}`}>
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-505 normal-case">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
