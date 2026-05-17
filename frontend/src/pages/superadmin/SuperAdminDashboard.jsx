import React from 'react';
import { ArrowRight, Building2, CreditCard, HeartPulse, ShieldCheck, Sparkles, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSuperAdminOverview } from './useSuperAdminOverview';
import { formatMoney, PLAN_LABELS, STATUS_LABELS } from './superAdminData';

export default function SuperAdminDashboard() {
  const { metricas, saloes, insights, loading, error } = useSuperAdminOverview();

  if (loading) return <StateBox message="Carregando painel global..." />;
  if (error) return <StateBox message={error} error />;

  const topRisk = [...insights.healthRows].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6 sm:p-8">
        <p className="brand-kicker">Visão executiva</p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-brand-display text-5xl leading-none text-white">Painel global do SaaS</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">
              Acompanhe receita estimada, risco da base, expansão por plano, alertas operacionais e a saúde geral dos salões em um só cockpit.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickLink to="/superadmin/billing" label="Abrir billing" />
            <QuickLink to="/superadmin/saude" label="Ver saúde da base" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} label="Total de salões" value={insights.total} detail={`${insights.active} ativos`} />
        <KpiCard icon={CreditCard} label="MRR estimado" value={formatMoney(metricas?.mrrEstimado)} detail={`ARR ${formatMoney(insights.arr)}`} />
        <KpiCard icon={HeartPulse} label="Base saudável" value={`${insights.healthyCount}/${insights.total || 0}`} detail={`${insights.attentionCount} em atenção`} />
        <KpiCard icon={TriangleAlert} label="Inadimplentes" value={insights.inadimplentes} detail={`${metricas?.trialExpirado || 0} trials expirados`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="MRR por plano" actionLabel="Ir para billing" actionTo="/superadmin/billing">
          <div className="space-y-4">
            {insights.byPlan.map((plan) => {
              const maxMrr = Math.max(...insights.byPlan.map((item) => item.mrr), 1);
              return (
                <div key={plan.plan} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-white">{PLAN_LABELS[plan.plan]}</span>
                    <span className="text-white/54">{plan.salons} salões · {formatMoney(plan.mrr)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-[#de97a5]" style={{ width: `${(plan.mrr / maxMrr) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Status da base">
          <div className="space-y-3">
            {Object.entries(metricas?.saloesPorStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-[1.2rem] border border-white/6 bg-black/16 px-4 py-3">
                <span className="text-sm font-semibold text-white">{STATUS_LABELS[status] || status}</span>
                <span className="text-lg font-black text-white">{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Contas com maior risco" actionLabel="Abrir saúde da base" actionTo="/superadmin/saude">
          <div className="space-y-3">
            {topRisk.map((salao) => (
              <div key={salao.id} className="rounded-[1.3rem] border border-white/6 bg-black/16 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{salao.nome}</p>
                    <p className="mt-1 text-xs text-white/44">/{salao.slug} · {STATUS_LABELS[salao.planoStatus] || salao.planoStatus}</p>
                  </div>
                  <div className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-200">
                    Risco {salao.riskScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Radar operacional">
          <div className="grid gap-4 sm:grid-cols-2">
            <RadarCard icon={Sparkles} title="Novos no mês" value={metricas?.novosEsseMes || 0} text="Entradas recentes que exigem onboarding e acompanhamento." />
            <RadarCard icon={Users} title="Clientes na base" value={metricas?.totalClientes?.toLocaleString('pt-BR') || '0'} text="Base consolidada de clientes dentro da plataforma." />
            <RadarCard icon={ShieldCheck} title="Contas com atenção" value={insights.attentionCount + insights.criticalCount} text="Somatório de salões com risco de churn ou travas operacionais." />
            <RadarCard icon={CreditCard} title="ARPA estimado" value={formatMoney(insights.arpa)} text="Receita média por salão com base nos planos atuais." />
          </div>
        </Panel>
      </section>

      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="brand-kicker">Próximos focos</p>
            <h2 className="mt-2 text-3xl font-brand-display text-white">Operação SaaS orientada por receita, risco e expansão.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <QuickLink to="/superadmin/comunicacao" label="Comunicação" />
            <QuickLink to="/superadmin/seguranca" label="Segurança" />
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
      <Icon className="h-7 w-7 text-[#efb1bb]" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{label}</p>
      <p className="mt-3 text-sm text-white/54">{detail}</p>
    </div>
  );
}

function Panel({ title, children, actionLabel, actionTo }) {
  return (
    <div className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {actionLabel && actionTo && (
          <Link to={actionTo} className="inline-flex items-center gap-2 text-xs font-bold text-[#efb1bb] transition hover:text-white">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function RadarCard({ icon: Icon, title, value, text }) {
  return (
    <div className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
      <Icon className="h-5 w-5 text-[#efb1bb]" />
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-white/52">{text}</p>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/76 transition hover:bg-white/[0.08]">
      {label}
    </Link>
  );
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-[2rem] border px-6 py-16 text-center ${error ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-white/6 bg-[#231b22] text-white/54'}`}>
      {message}
    </div>
  );
}
