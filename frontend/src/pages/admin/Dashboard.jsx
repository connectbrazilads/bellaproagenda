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
  MessageSquare,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import {
  getAgendamentos,
  getClientes,
  getProfissionais,
  dispararIAProativa,
  dispararLembretes,
  updateStatusAgendamento,
  getDashboardExecutivo,
  getResumoFaturasSalao,
} from '../../services/api';
import {
  calculateAgendamentoDuration,
  calculateAgendamentoTotal,
  cn,
  formatDateInput,
  getAgendamentoItensExtras,
} from '../../lib/utils';
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
    sparkline: [{ val: 0 }],
  });
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [executivo, setExecutivo] = useState({
    cards: {},
    produtividade: [],
    faturamentoPorCategoria: [],
    alertas: [],
  });
  const [billingResumo, setBillingResumo] = useState({
    abertas: 0,
    vencidas: 0,
    totalPendencias: 0,
    temPendencia: false,
    proxima: null,
  });
  const [loading, setLoading] = useState(true);
  const hojeStr = formatDateInput();
  const pageWidth = useElementWidth(
    pageRef,
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const isCompactPage = pageWidth < 1200;
  const showWideStatusGrid = pageWidth >= 1200;
  const showThreePanelLayout = pageWidth >= 1200;
  const showDualInsights = pageWidth >= 1080;

  const loadDashboard = async () => {
    try {
      const [ra, rc, rp, re, rf] = await Promise.all([
        getAgendamentos({ data: hojeStr }),
        getClientes(),
        getProfissionais(),
        getDashboardExecutivo(),
        getResumoFaturasSalao().catch(() => ({
          data: { abertas: 0, vencidas: 0, totalPendencias: 0, temPendencia: false, proxima: null },
        })),
      ]);

      const ags = ra.data?.agendamentos || [];
      const profissionais = (rp.data || []).filter((prof) => prof.ativo);
      const concluidos = ags.filter((a) => a.status === 'concluido');
      const emAtendimento = ags.filter((a) => a.status === 'em_atendimento');
      const aguardando = ags.filter((a) => a.status === 'confirmado');

      const profissionaisComAgenda = new Set(ags.map((a) => a.profissionalId).filter(Boolean)).size;
      const minutosReservados = ags.reduce(
        (acc, a) => acc + calculateAgendamentoDuration(a),
        0
      );
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
        sparkline: sparkline.length ? sparkline : [{ val: 0 }],
      });
      setExecutivo(
        re.data || { cards: {}, produtividade: [], faturamentoPorCategoria: [], alertas: [] }
      );
      setBillingResumo(
        rf.data || { abertas: 0, vencidas: 0, totalPendencias: 0, temPendencia: false, proxima: null }
      );
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
    if (
      !confirm(
        'Deseja que a IA analise os clientes ausentes e envie convites automáticos?'
      )
    )
      return;
    try {
      const res = await dispararIAProativa();
      alert(`${res.data.convitesEnviados} convites enviados com sucesso!`);
    } catch {
      alert('Erro ao disparar IA.');
    }
  }

  async function handleLembretes() {
    if (!confirm('Deseja enviar lembretes para os clientes de hoje?')) return;
    try {
      const res = await dispararLembretes();
      alert(`${res.data.lembretesEnviados} lembretes enviados!`);
    } catch {
      alert('Erro ao disparar lembretes.');
    }
  }

  async function updateAgendamentoStatus(ag, newStatus) {
    try {
      await updateStatusAgendamento(ag.id, newStatus);
      if (newStatus === 'concluido') {
        setCheckoutSuccess(ag);
      }
      await loadDashboard();
    } catch {
      alert('Erro ao atualizar status.');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#eadde1] border-t-[#b84c6b]" />
        <p className="text-xs font-semibold text-[#745e69] dark:text-white/60">
          Sincronizando BellaPro...
        </p>
      </div>
    );
  }

  const agendaOrdenada = [...(stats.hoje || [])].sort((a, b) =>
    (a.inicioHora || '').localeCompare(b.inicioHora || '')
  );

  return (
    <div ref={pageRef} className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header */}
      <header
        className={cn(
          'flex flex-col items-start justify-between gap-4 border-b border-[#eae1e4] pb-5 dark:border-[#28212f]',
          !isCompactPage && 'lg:flex-row lg:items-center'
        )}
      >
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {stats.profissionaisAtivos} profissionais ativos hoje
          </span>
          <h1 className="mt-2.5 font-brand-display text-3xl font-bold tracking-[-0.02em] text-[#23141c] dark:text-white sm:text-4xl">
            Performance <span className="italic text-[#b84c6b]">Geral</span>
          </h1>
          <p className="mt-1 text-sm text-[#6b5761] dark:text-white/60">
            Visão em tempo real dos atendimentos, faturamento e equipe do salão.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto">
          <button
            type="button"
            onClick={dispararIA}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#23141c] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#38212d] dark:bg-[#c65d7b] dark:hover:bg-[#b24b69] sm:flex-none"
          >
            <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span>IA Proativa</span>
          </button>
          <button
            type="button"
            onClick={handleLembretes}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#e2d5da] bg-white px-4 py-2.5 text-xs font-bold text-[#23141c] shadow-sm transition hover:border-[#c65d7b]/40 hover:bg-[#fdf5f7] dark:border-[#352b3e] dark:bg-[#1c1721] dark:text-white dark:hover:bg-[#261f2d] sm:flex-none"
          >
            <Calendar className="h-4 w-4 text-[#b84c6b]" />
            <span>Enviar Lembretes</span>
          </button>
        </div>
      </header>

      {/* Billing Alert Banner */}
      {billingResumo.temPendencia && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/15">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                {billingResumo.vencidas > 0 ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CreditCard size={20} />
                )}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
                  Financeiro da Assinatura
                </p>
                <h3 className="mt-0.5 text-base font-bold text-amber-950 dark:text-white">
                  {billingResumo.vencidas > 0
                    ? 'Fatura vencida aguardando pagamento.'
                    : 'Fatura em aberto aguardando pagamento.'}
                </h3>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/80">
                  Você possui {billingResumo.totalPendencias} pendência(s) financeira(s).
                  {billingResumo.proxima
                    ? ` Próximo vencimento em ${new Date(
                        billingResumo.proxima.vencimento
                      ).toLocaleDateString('pt-BR')}.`
                    : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/faturas')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#23141c] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#38212d]"
            >
              <span>Ver faturas</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Monitor de Piso */}
      <div className={cn('grid gap-3.5', showWideStatusGrid ? 'lg:grid-cols-4' : 'sm:grid-cols-2')}>
        <div className="flex flex-col justify-center rounded-2xl border border-[#eae1e4] bg-white px-5 py-4 dark:border-[#28212f] dark:bg-[#1c1721]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b84c6b]">
            Monitor de Piso
          </p>
          <h3 className="mt-0.5 font-brand-display text-xl font-bold text-[#23141c] dark:text-white">
            Status em Tempo Real
          </h3>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200/80 bg-white px-5 py-4 dark:border-amber-500/20 dark:bg-[#1c1721]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none text-[#23141c] tabular-nums dark:text-white">
              {stats.aguardando}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Aguardando Início
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-[#c65d7b]/25 bg-white px-5 py-4 dark:border-[#c65d7b]/30 dark:bg-[#1c1721]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf2f5] text-[#b84c6b] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none text-[#23141c] tabular-nums dark:text-white">
              {stats.emAtendimento}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#b84c6b] dark:text-[#f0aab8]">
              Em Atendimento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/80 bg-white px-5 py-4 dark:border-emerald-500/20 dark:bg-[#1c1721]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle size={18} />
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none text-[#23141c] tabular-nums dark:text-white">
              {stats.concluidos}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Concluídos Hoje
            </p>
          </div>
        </div>
      </div>

      {/* Main KPI Row */}
      <div
        className={cn(
          'grid gap-4',
          showWideStatusGrid ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'
        )}
      >
        <StatCard
          label="Agendamentos Hoje"
          value={stats.hoje.length}
          icon={<Calendar />}
          color="rose"
          sparkline={stats.sparkline}
        />
        <StatCard
          label="Concluídos"
          value={stats.concluidos}
          icon={<CheckCircle />}
          color="emerald"
        />
        <StatCard
          label="Faturamento Hoje"
          value={`R$ ${Number(stats.faturamentoHoje || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}`}
          icon={<DollarSign />}
          color="plum"
          sparkline={stats.sparkline}
        />
        <StatCard
          label="Clientes na Base"
          value={stats.totalClientes}
          icon={<Users />}
          color="amber"
          sparkline={stats.sparkline}
        />
      </div>

      {/* Executive Mini KPIs */}
      <div
        className={cn(
          'grid gap-3.5',
          showWideStatusGrid ? 'grid-cols-2 xl:grid-cols-5' : 'grid-cols-2 lg:grid-cols-3'
        )}
      >
        <MiniExecCard
          label="Ticket Médio"
          value={`R$ ${Number(executivo.cards?.ticketMedio || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}`}
        />
        <MiniExecCard label="Cancelados" value={executivo.cards?.cancelados || 0} tone="rose" />
        <MiniExecCard label="No-Show" value={executivo.cards?.noShows || 0} tone="amber" />
        <MiniExecCard
          label="Taxa de Retorno"
          value={`${executivo.cards?.retornoTaxa || 0}%`}
          tone="emerald"
        />
        <MiniExecCard
          label="Baixo Estoque"
          value={executivo.cards?.baixoEstoque || 0}
          tone="blue"
        />
      </div>

      {/* Today's Appointments + AI Sidebar */}
      <div
        className={cn(
          'grid grid-cols-1 gap-6',
          showThreePanelLayout ? 'lg:grid-cols-3' : 'xl:grid-cols-[minmax(0,1fr)_340px]'
        )}
      >
        <div className={cn('space-y-3', showThreePanelLayout && 'lg:col-span-2')}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#745e69] dark:text-white/55">
              Próximos do Dia
            </h2>
            <button
              type="button"
              onClick={() => navigate('/admin/agenda')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#b84c6b] transition hover:text-[#963653]"
            >
              <span>Ver Agenda Completa</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#eae1e4] bg-white divide-y divide-[#f0e8eb] shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] dark:divide-[#28212f]">
            {agendaOrdenada.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8f4f5] text-[#9b828e] dark:bg-white/5">
                  <Calendar className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[#5b4852] dark:text-white/65">
                  Nenhum atendimento agendado para hoje.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/admin/agenda')}
                  className="mt-4 rounded-full bg-[#23141c] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#38212d]"
                >
                  Abrir Agenda
                </button>
              </div>
            ) : (
              agendaOrdenada.map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate('/admin/agenda')}
                  className="flex cursor-pointer flex-col items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#faf7f5] dark:hover:bg-white/[0.02] sm:flex-row sm:items-center"
                >
                  <div className="flex w-full min-w-0 items-center gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[#eae1e4] bg-[#faf7f5] dark:border-[#352b3e] dark:bg-[#261f2d]">
                      <span className="text-base font-extrabold text-[#23141c] tabular-nums dark:text-white">
                        {a.inicioHora}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c727e]">
                        Hora
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h4 className="truncate text-sm font-bold text-[#23141c] dark:text-white">
                        {a.clienteNome}
                      </h4>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#6b5761] dark:text-white/60">
                        <span className="rounded-md bg-[#fdf2f5] px-2 py-0.5 text-[11px] font-semibold text-[#b84c6b] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]">
                          {a.servico?.nome || a.pacote?.nome}
                        </span>
                        <span>com</span>
                        <span className="font-semibold text-[#23141c] dark:text-white/90">
                          {a.profissional?.nome}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                    {a.status === 'confirmado' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAgendamentoStatus(a, 'em_atendimento');
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#b84c6b] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#9c3b57] sm:flex-none"
                      >
                        <TrendingUp size={13} />
                        <span>Iniciar</span>
                      </button>
                    )}

                    {a.status === 'em_atendimento' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAgendamentoStatus(a, 'concluido');
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 sm:flex-none"
                      >
                        <CheckCircle size={13} />
                        <span>Finalizar</span>
                      </button>
                    )}

                    {a.status === 'concluido' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const total = calculateAgendamentoTotal(a);
                          const itensArr = [
                            a.servico?.nome || a.pacote?.nome,
                            ...getAgendamentoItensExtras(a).map(
                              (i) => i.servico?.nome || i.nome
                            ),
                            ...(a.produtos?.map(
                              (p) => `${p.quantidade}x ${p.produto?.nome}`
                            ) || []),
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
                          window.open(
                            `https://wa.me/55${String(a.clienteTelefone || '').replace(
                              /\D/g,
                              ''
                            )}?text=${msg}`,
                            '_blank'
                          );
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-[#25D366] hover:text-white dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 sm:flex-none"
                      >
                        <MessageSquare size={13} />
                        <span>Recibo</span>
                      </button>
                    )}

                    <span
                      className={cn(
                        'rounded-xl border px-3 py-2 text-center text-[11px] font-bold',
                        a.status === 'concluido' &&
                          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300',
                        a.status === 'em_atendimento' &&
                          'border-[#c65d7b]/25 bg-[#fdf2f5] text-[#b84c6b] dark:border-[#c65d7b]/30 dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]',
                        a.status === 'confirmado' &&
                          'border-[#eae1e4] bg-[#faf7f5] text-[#6b5761] dark:border-[#352b3e] dark:bg-white/5 dark:text-white/65'
                      )}
                    >
                      {a.status === 'concluido'
                        ? 'Finalizado'
                        : a.status === 'em_atendimento'
                          ? 'Em Agenda'
                          : 'Aguardando'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Card & Occupancy */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#745e69] dark:text-white/55">
            Inteligência & Ocupação
          </h2>

          <div className="relative overflow-hidden rounded-2xl bg-[#23141c] p-6 text-white shadow-md">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#c65d7b]/30 blur-2xl" />
            <div className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Zap className="h-5 w-5 text-amber-300 fill-amber-300" />
              </div>
              <h3 className="font-brand-display text-2xl font-bold text-white">
                Análise Preditiva
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/75">
                A IA analisa sua carteira atual e dispara convites personalizados para clientes ausentes, preenchendo os horários vazios da semana.
              </p>
              <button
                type="button"
                onClick={dispararIA}
                className="mt-5 w-full rounded-xl bg-[#c65d7b] py-3 text-xs font-bold text-white transition hover:bg-[#b24b69]"
              >
                Otimizar Retenção
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#eae1e4] bg-white p-5 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
                Taxa de Ocupação Hoje
              </p>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.ocupacao}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f1e8eb] dark:bg-white/10">
              <div
                style={{ width: `${stats.ocupacao}%` }}
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Productivity & Category Revenue */}
      <div className={cn('grid gap-6', showDualInsights && 'xl:grid-cols-2')}>
        <div className="rounded-2xl border border-[#eae1e4] bg-white p-5 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#23141c] dark:text-white">
              Produtividade por Profissional
            </h3>
            <span className="rounded-full bg-[#faf7f5] px-2.5 py-1 text-[11px] font-semibold text-[#745e69] dark:bg-white/5 dark:text-white/55">
              Mensal
            </span>
          </div>
          <div className="space-y-2.5">
            {(executivo.produtividade || []).slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-[#f0e8eb] bg-[#fcfafb] px-4 py-3 dark:border-[#28212f] dark:bg-white/[0.02]"
              >
                <div>
                  <p className="text-sm font-bold text-[#23141c] dark:text-white">{item.nome}</p>
                  <p className="mt-0.5 text-xs text-[#745e69] dark:text-white/55">
                    {item.atendimentos} atendimentos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#b84c6b] tabular-nums dark:text-[#f0aab8]">
                    R${' '}
                    {Number(item.faturamento || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    Comissão R${' '}
                    {Number(item.comissao || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#eae1e4] bg-white p-5 shadow-sm dark:border-[#28212f] dark:bg-[#1c1721] sm:p-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#23141c] dark:text-white">
                Faturamento por Categoria
              </h3>
              <span className="rounded-full bg-[#faf7f5] px-2.5 py-1 text-[11px] font-semibold text-[#745e69] dark:bg-white/5 dark:text-white/55">
                Geral
              </span>
            </div>
            <div className="space-y-2.5">
              {(executivo.faturamentoPorCategoria || []).slice(0, 4).map((item) => (
                <div
                  key={item.nome}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#f0e8eb] bg-[#fcfafb] px-4 py-3 dark:border-[#28212f] dark:bg-white/[0.02]"
                >
                  <p className="text-sm font-bold text-[#23141c] dark:text-white">{item.nome}</p>
                  <p className="text-sm font-bold text-[#b84c6b] tabular-nums dark:text-[#f0aab8]">
                    R${' '}
                    {Number(item.valor || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#f0e8eb] bg-[#faf7f5] p-4 dark:border-[#28212f] dark:bg-white/[0.02]">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#745e69] dark:text-white/55">
                Alertas Operacionais
              </p>
              <span className="rounded-full bg-[#fdf2f5] px-2 py-0.5 text-xs font-bold text-[#b84c6b] dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]">
                {executivo.alertas?.length || 0}
              </span>
            </div>
            <div className="space-y-2">
              {(executivo.alertas?.length
                ? executivo.alertas
                : [{ nome: 'Nenhum alerta crítico', estoque: '-' }]
              ).map((alerta, index) => (
                <div
                  key={`${alerta.nome}-${index}`}
                  className="rounded-xl border border-[#eae1e4] bg-white px-3.5 py-2.5 dark:border-[#28212f] dark:bg-[#1c1721]"
                >
                  <p className="text-xs font-bold text-[#23141c] dark:text-white">{alerta.nome}</p>
                  <p className="mt-0.5 text-[11px] text-[#745e69] dark:text-white/55">
                    {alerta.estoque === '-'
                      ? 'Estabilidade operacional'
                      : `Estoque mínimo: ${alerta.estoque} unidades`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Success Modal */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl border border-[#eae1e4] bg-white p-7 text-center shadow-2xl dark:border-[#352b3e] dark:bg-[#1c1721]"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle size={28} />
            </div>
            <h3 className="font-brand-display text-2xl font-bold text-[#23141c] dark:text-white">
              Atendimento Concluído
            </h3>
            <p className="mt-2 mb-6 text-xs leading-relaxed text-[#6b5761] dark:text-white/60">
              As atualizações foram consolidadas e as comissões registradas corretamente.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const total = calculateAgendamentoTotal(checkoutSuccess);
                  const itensArr = [
                    checkoutSuccess.servico?.nome || checkoutSuccess.pacote?.nome,
                    ...getAgendamentoItensExtras(checkoutSuccess).map(
                      (i) => i.servico?.nome || i.nome
                    ),
                    ...(checkoutSuccess.produtos?.map(
                      (p) => `${p.quantidade}x ${p.produto?.nome}`
                    ) || []),
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
                  window.open(
                    `https://wa.me/55${String(checkoutSuccess.clienteTelefone || '').replace(
                      /\D/g,
                      ''
                    )}?text=${msg}`,
                    '_blank'
                  );
                  setCheckoutSuccess(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-xs font-bold text-white transition hover:brightness-95"
              >
                <MessageSquare size={14} /> Enviar Comprovante WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setCheckoutSuccess(null)}
                className="w-full rounded-xl border border-[#e2d5da] bg-[#faf7f5] py-3 text-xs font-bold text-[#5b4852] transition hover:bg-[#f1e7ea] dark:border-[#352b3e] dark:bg-white/5 dark:text-white/75"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, trend, sparkline }) {
  const colors = {
    rose: 'bg-[#fdf2f5] text-[#b84c6b] border-[#c65d7b]/20 dark:bg-[#c65d7b]/20 dark:text-[#f0aab8]',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300',
    plum: 'bg-[#f4eef1] text-[#23141c] border-[#23141c]/10 dark:bg-white/10 dark:text-white',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300',
  };

  const strokes = {
    rose: '#c65d7b',
    emerald: '#10b981',
    plum: '#5b4852',
    amber: '#f59e0b',
  };

  return (
    <div className="rounded-2xl border border-[#eae1e4] bg-white p-5 shadow-sm transition hover:border-[#c65d7b]/35 dark:border-[#28212f] dark:bg-[#1c1721]">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl border',
            colors[color] || colors.rose
          )}
        >
          {React.cloneElement(icon, { size: 18, strokeWidth: 2 })}
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <ArrowUpRight className="h-3 w-3" /> {trend}
          </span>
        )}
      </div>

      <p className="text-2xl font-extrabold tracking-tight text-[#23141c] tabular-nums dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#745e69] dark:text-white/55">{label}</p>

      {sparkline && (
        <div className="mt-4 h-9 w-full opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline?.length ? sparkline : [{ val: 0 }]}>
              <Line
                type="monotone"
                dataKey="val"
                stroke={strokes[color] || '#c65d7b'}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function MiniExecCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-[#eae1e4] text-[#23141c] dark:border-[#28212f] dark:text-white',
    rose: 'border-[#c65d7b]/25 text-[#b84c6b] dark:border-[#c65d7b]/30 dark:text-[#f0aab8]',
    amber: 'border-amber-200/80 text-amber-700 dark:border-amber-500/25 dark:text-amber-300',
    emerald: 'border-emerald-200/80 text-emerald-700 dark:border-emerald-500/25 dark:text-emerald-300',
    blue: 'border-blue-200/80 text-blue-700 dark:border-blue-500/25 dark:text-blue-300',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white px-4 py-3.5 shadow-sm dark:bg-[#1c1721]',
        tones[tone] || tones.default
      )}
    >
      <p className="text-[11px] font-semibold text-[#745e69] dark:text-white/55">{label}</p>
      <p className="mt-1 text-lg font-extrabold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
