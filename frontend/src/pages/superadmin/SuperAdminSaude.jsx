import React, { useMemo, useState } from 'react';
import { useSuperAdminOverview } from './useSuperAdminOverview';
import { healthBadge } from './superAdminData';

export default function SuperAdminSaude() {
  const { insights, loading, error } = useSuperAdminOverview();
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    return insights.healthRows
      .filter((item) => !filter || item.health === filter)
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [filter, insights.healthRows]);

  if (loading) return <StateBox message="Carregando saúde da base..." />;
  if (error) return <StateBox message={error} error />;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6 sm:p-8">
        <p className="brand-kicker">Saúde da base</p>
        <h1 className="mt-3 font-brand-display text-5xl leading-none text-white">Risco, adoção e onboarding por salão</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">
          Priorize quem precisa de recuperação, implantação ou atenção comercial antes que o churn apareça.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Saudáveis" value={insights.healthyCount} tone="emerald" />
        <Metric title="Em atenção" value={insights.attentionCount} tone="amber" />
        <Metric title="Críticos" value={insights.criticalCount} tone="red" />
      </section>

      <section className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-black text-white">Mapa da saúde operacional</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'Todos' },
              { value: 'saudavel', label: 'Saudáveis' },
              { value: 'atencao', label: 'Em atenção' },
              { value: 'critico', label: 'Críticos' },
            ].map((option) => (
              <button
                key={option.value || 'all'}
                onClick={() => setFilter(option.value)}
                className={`rounded-[1rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${filter === option.value ? 'bg-[#de97a5] text-white' : 'bg-white/[0.05] text-white/60'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((salao) => (
            <div key={salao.id} className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="truncate text-base font-semibold text-white">{salao.nome}</p>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${healthBadge(salao.health)}`}>
                      {salao.health}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/44">/{salao.slug}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="Risco" value={salao.riskScore} />
                  <MiniStat label="Onboarding" value={`${salao.onboardingScore || 0}/5`} />
                  <MiniStat label="Adoção" value={`${salao.adoptionRate}%`} />
                  <MiniStat label="Alertas" value={salao.alertas?.length || 0} />
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="rounded-[1.4rem] border border-white/6 bg-black/16 px-4 py-6 text-sm text-white/48">Nenhum salão encontrado para esse filtro.</div>}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, tone }) {
  const tones = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    red: 'border-red-500/20 bg-red-500/10 text-red-200',
  };
  return (
    <div className={`rounded-[2rem] border p-6 ${tones[tone]}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em]">{title}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-white/6 bg-white/[0.03] px-3 py-3 text-center">
      <p className="text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/34">{label}</p>
    </div>
  );
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-[2rem] border px-6 py-16 text-center ${error ? 'border-red-500/20 bg-red-500/10 text-red-200' : 'border-white/6 bg-[#231b22] text-white/54'}`}>
      {message}
    </div>
  );
}
