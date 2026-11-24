import React from 'react';
import { ArrowRight, Building2, CreditCard, HeartPulse, ShieldCheck, Sparkles, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSuperAdminOverview } from './useSuperAdminOverview';
import { formatMoney, PLAN_LABELS, STATUS_LABELS } from './superAdminData';

export default function SuperAdminDashboard() {
  const { metricas, insights, loading, error } = useSuperAdminOverview();

  if (loading) return <StateBox message="Carregando painel global..." />;
  if (error) return <StateBox message={error} error />;

  const topRisk = [...insights.healthRows].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Visão executiva</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
              Painel global do SaaS
            </h1>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#6B5761]">
              Acompanhe receita estimada, risco da base, expansão por plano, alertas operacionais e a saúde geral dos salões em um só cockpit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <QuickLink to="/superadmin/billing" label="Abrir billing" />
            <QuickLink to="/superadmin/saude" label="Ver saúde da base" primary />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Building2} label="Total de salões" value={insights.total} detail={`${insights.active} ativos`} />
        <KpiCard icon={CreditCard} label="MRR estimado" value={formatMoney(metricas?.mrrEstimado)} detail={`ARR ${formatMoney(insights.arr)}`} accent />
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
                    <span className="font-bold text-[#23141C]">{PLAN_LABELS[plan.plan]}</span>
                    <span className="text-[#6B5761]">{plan.salons} salões · <strong className="text-[#23141C]">{formatMoney(plan.mrr)}</strong></span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#EFE7EA]">
                    <div className="h-full rounded-full bg-[#B84C6B]" style={{ width: `${(plan.mrr / maxMrr) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Status da base">
          <div className="space-y-2.5">
            {Object.entries(metricas?.saloesPorStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] px-4 py-3">
                <span className="text-sm font-semibold text-[#23141C]">{STATUS_LABELS[status] || status}</span>
                <span className="text-lg font-bold text-[#23141C]">{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Contas com maior risco" actionLabel="Abrir saúde da base" actionTo="/superadmin/saude">
          <div className="space-y-2.5">
            {topRisk.map((salao) => (
              <div key={salao.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#23141C]">{salao.nome}</p>
                    <p className="mt-0.5 text-xs text-[#6B5761]">/{salao.slug} · {STATUS_LABELS[salao.planoStatus] || salao.planoStatus}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                    Risco {salao.riskScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Radar operacional">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <RadarCard icon={Sparkles} title="Novos no mês" value={metricas?.novosEsseMes || 0} text="Entradas recentes que exigem onboarding e acompanhamento." />
            <RadarCard icon={Users} title="Clientes na base" value={metricas?.totalClientes?.toLocaleString('pt-BR') || '0'} text="Base consolidada de clientes dentro da plataforma." />
            <RadarCard icon={ShieldCheck} title="Contas com atenção" value={insights.attentionCount + insights.criticalCount} text="Somatório de salões com risco de churn ou travas operacionais." />
            <RadarCard icon={CreditCard} title="ARPA estimado" value={formatMoney(insights.arpa)} text="Receita média por salão com base nos planos atuais." />
          </div>
        </Panel>
      </section>

      <section className="rounded-3xl bg-[#23141C] p-6 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E6A3B5]">Próximos focos</p>
            <h2 className="mt-1.5 font-brand-display text-2xl font-semibold text-white">
              Operação SaaS orientada por receita, risco e expansão.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/superadmin/comunicacao" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15">
              Comunicação
            </Link>
            <Link to="/superadmin/seguranca" className="rounded-xl bg-[#B84C6B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C65D7B]">
              Segurança
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, detail, accent = false }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${accent ? 'border-[#23141C] bg-[#23141C] text-white' : 'border-[#EAE1E4] bg-white text-[#23141C]'}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ? 'bg-white/10 text-[#E6A3B5]' : 'bg-[#FDF7F9] text-[#B84C6B]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.16em] ${accent ? 'text-white/60' : 'text-[#8E7682]'}`}>{label}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-white/75' : 'text-[#6B5761]'}`}>{detail}</p>
    </div>
  );
}

function Panel({ title, children, actionLabel, actionTo }) {
  return (
    <div className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#23141C]">{title}</h2>
        {actionLabel && actionTo && (
          <Link to={actionTo} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B84C6B] transition hover:text-[#23141C]">
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
    <div className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
      <Icon className="h-5 w-5 text-[#B84C6B]" />
      <p className="mt-3 text-2xl font-bold text-[#23141C]">{value}</p>
      <p className="mt-0.5 text-sm font-bold text-[#23141C]">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6B5761]">{text}</p>
    </div>
  );
}

function QuickLink({ to, label, primary = false }) {
  return (
    <Link
      to={to}
      className={
        primary
          ? 'rounded-xl bg-[#23141C] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3A222E]'
          : 'rounded-xl border border-[#E2D5DA] bg-white px-4 py-2.5 text-xs font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]'
      }
    >
      {label}
    </Link>
  );
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-3xl border px-6 py-16 text-center text-sm font-medium ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#EAE1E4] bg-white text-[#6B5761]'}`}>
      {message}
    </div>
  );
}
