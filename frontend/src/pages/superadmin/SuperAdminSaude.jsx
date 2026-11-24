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
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Saúde da base</p>
        <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
          Risco, adoção e onboarding por salão
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#6B5761]">
          Priorize quem precisa de recuperação, implantação ou atenção comercial antes que o churn apareça.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Saudáveis" value={insights.healthyCount} tone="emerald" />
        <Metric title="Em atenção" value={insights.attentionCount} tone="amber" />
        <Metric title="Críticos" value={insights.criticalCount} tone="red" />
      </section>

      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-[#23141C]">Mapa da saúde operacional</h2>
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
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  filter === option.value
                    ? 'bg-[#23141C] text-white'
                    : 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761] hover:text-[#23141C]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {rows.map((salao) => (
            <div key={salao.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="truncate text-base font-bold text-[#23141C]">{salao.nome}</p>
                    <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${healthBadge(salao.health)}`}>
                      {salao.health}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6B5761]">/{salao.slug}</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <MiniStat label="Risco" value={salao.riskScore} />
                  <MiniStat label="Onboarding" value={`${salao.onboardingScore || 0}/5`} />
                  <MiniStat label="Adoção" value={`${salao.adoptionRate}%`} />
                  <MiniStat label="Alertas" value={salao.alertas?.length || 0} />
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] px-4 py-8 text-center text-sm text-[#6B5761]">
              Nenhum salão encontrado para esse filtro.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, tone }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  return (
    <div className={`rounded-3xl border p-6 ${tones[tone]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.16em]">{title}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-[#EAE1E4] bg-white px-3.5 py-2.5 text-center">
      <p className="text-sm font-bold text-[#23141C]">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8E7682]">{label}</p>
    </div>
  );
}

function StateBox({ message, error = false }) {
  return (
    <div className={`rounded-3xl border px-6 py-16 text-center text-sm font-medium ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#EAE1E4] bg-white text-[#6B5761]'}`}>
      {message}
    </div>
  );
}
