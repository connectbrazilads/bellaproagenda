import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Gift,
  Info,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { getAdminSalao, updateFidelidadeConfig } from '../../services/api';
import { cn } from '../../lib/utils';

const TIPO_OPCOES = [
  {
    id: 'cashback',
    titulo: 'Cashback Premium',
    descricao: 'Devolva um percentual do valor gasto para a cliente usar em futuras visitas.',
    exemplo: 'A cada atendimento, um percentual retorna como crédito.',
  },
  {
    id: 'pontos',
    titulo: 'Clube de Pontos',
    descricao: 'Transforme consumo recorrente em pontos acumulativos para resgate de benefícios.',
    exemplo: 'A cada R$ 1,00 gasto, a cliente acumula pontos definidos.',
  },
];

function Badge({ active, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors',
        active
          ? 'bg-[#d48997]/15 text-[#d48997]'
          : 'bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400'
      )}
    >
      {children}
    </span>
  );
}

export default function Fidelidade() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    fidelidadeAtiva: false,
    fidelidadeTipo: 'cashback',
    fidelidadeRegra: '',
    fidelidadeMeta: 100,
    fidelidadePremio: '',
  });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const response = await getAdminSalao();
        const salao = response?.data || response;
        if (!ativo) return;

        setForm({
          fidelidadeAtiva: !!salao?.fidelidadeAtiva,
          fidelidadeTipo: salao?.fidelidadeTipo || 'cashback',
          fidelidadeRegra: salao?.fidelidadeRegra || '',
          fidelidadeMeta: Number(salao?.fidelidadeMeta || 100),
          fidelidadePremio: salao?.fidelidadePremio || '',
        });
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const preview = useMemo(() => {
    if (!form.fidelidadeAtiva) {
      return {
        titulo: 'Programa Pausado',
        descricao:
          'Ative o programa de fidelidade para apresentar e creditar recompensas automaticamente no relacionamento com suas clientes.',
        destaque: 'Inativo',
      };
    }

    if (form.fidelidadeTipo === 'cashback') {
      return {
        titulo: 'Cashback Ativo',
        descricao: `A cliente recebe ${form.fidelidadeRegra || '0'}% de volta em crédito para usar em novos atendimentos.`,
        destaque: `${form.fidelidadeRegra || '0'}% de retorno`,
      };
    }

    return {
      titulo: 'Pontuação Ativa',
      descricao: `A cada compra, a cliente acumula pontos até atingir ${form.fidelidadeMeta || 0} e desbloquear o prêmio: ${form.fidelidadePremio || 'um prêmio especial'}.`,
      destaque: `${form.fidelidadeMeta || 0} pontos`,
    };
  }, [form]);

  async function salvar() {
    setSalvando(true);
    try {
      await updateFidelidadeConfig(form);
      window.alert('Configurações de fidelidade salvas com sucesso.');
    } catch {
      window.alert('Não foi possível salvar as configurações agora.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-8 pb-20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Award className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Fidelização</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Programa de <span className="text-[#d48997]">Fidelidade</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Aumente a retenção de clientes e a recorrência de visitas com campanhas transparentes e fáceis de gerenciar.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar Estratégia'}
        </motion.button>
      </header>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
        {/* Left Section - Configs */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl transition-all',
                    form.fidelidadeAtiva
                      ? 'bg-[#d48997]/10 text-[#d48997]'
                      : 'bg-black/[0.04] dark:bg-white/[0.04] text-gray-400'
                  )}
                >
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">
                    Status do Programa
                  </span>
                  <h3 className="mt-0.5 text-lg font-serif font-normal text-gray-900 dark:text-white">
                    {form.fidelidadeAtiva ? 'Campanha Ativa' : 'Campanha Inativa'}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    fidelidadeAtiva: !prev.fidelidadeAtiva,
                  }))
                }
                className={cn(
                  'relative h-7 w-12 rounded-full transition-colors outline-none focus:ring-2 focus:ring-[#d48997]/25',
                  form.fidelidadeAtiva ? 'bg-[#d48997]' : 'bg-gray-200 dark:bg-zinc-700'
                )}
              >
                <motion.span
                  animate={{ x: form.fidelidadeAtiva ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-[2px] left-0 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md text-gray-800"
                >
                  <Zap className={cn("h-3.5 w-3.5", form.fidelidadeAtiva ? "text-[#d48997]" : "text-gray-400")} />
                </motion.span>
              </button>
            </div>
          </div>

          {/* Types Selection */}
          <div className="grid gap-5 md:grid-cols-2">
            {TIPO_OPCOES.map((tipo) => {
              const active = form.fidelidadeTipo === tipo.id;
              return (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      fidelidadeTipo: tipo.id,
                    }))
                  }
                  className={cn(
                    'group text-left rounded-2xl border p-6 transition-all',
                    active
                      ? 'border-[#d48997] bg-[#d48997]/5 shadow-sm'
                      : 'border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md hover:border-black/[0.08] dark:hover:border-white/[0.08]'
                  )}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997] group-hover:scale-105 transition-transform">
                    {tipo.id === 'cashback' ? <Gift className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="font-serif text-base font-normal text-gray-900 dark:text-white">
                        {tipo.titulo}
                      </h4>
                      <Badge active={active}>{active ? 'Ativo' : 'Opção'}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                      {tipo.descricao}
                    </p>
                    <p className="text-[10px] font-medium text-[#d48997] opacity-80 pt-1">
                      {tipo.exemplo}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rule Configuration */}
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-black/[0.03] dark:border-white/5 pb-3">
              <Info className="h-4 w-4 text-[#d48997]" />
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Parâmetros e Regras
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {form.fidelidadeTipo === 'cashback' ? 'Percentual de Retorno (%)' : 'Pontos por Real Gasto'}
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.fidelidadeRegra}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fidelidadeRegra: e.target.value,
                    }))
                  }
                  placeholder={form.fidelidadeTipo === 'cashback' ? 'Ex: 5' : 'Ex: 1'}
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  Meta para Resgate
                </span>
                <input
                  type="number"
                  min="1"
                  value={form.fidelidadeMeta}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fidelidadeMeta: Number(e.target.value || 0),
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  Prêmio / Recompensa por Atingir a Meta
                </span>
                <input
                  type="text"
                  value={form.fidelidadePremio}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fidelidadePremio: e.target.value,
                    }))
                  }
                  placeholder="Ex: Escova Cortesia, Desconto de R$ 50,00, Hidratação L'Oréal..."
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Sidebar Preview */}
        <div className="space-y-6">
          {/* Card Preview */}
          <div className="rounded-2xl border border-[#d48997]/20 bg-gradient-to-br from-[#d48997]/5 to-[#d48997]/0 p-6 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997]">
                <Award className="h-5 w-5" />
              </div>
              <Badge active>{preview.destaque}</Badge>
            </div>

            <h4 className="font-serif text-lg font-normal text-gray-900 dark:text-white">
              {preview.titulo}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              {preview.descricao}
            </p>

            <div className="border-t border-black/[0.04] dark:border-white/5 pt-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                  Simulação
                </span>
                <span className="text-lg font-semibold text-gray-950 dark:text-white">
                  {form.fidelidadeTipo === 'cashback' ? 'Crédito Progressivo' : `${form.fidelidadeMeta || 0} Pontos`}
                </span>
              </div>
              <TrendingUp className="h-5 w-5 text-[#d48997]" />
            </div>
          </div>

          {/* Tips Card */}
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#d48997]">
              <Sparkles className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Boas Práticas
              </span>
            </div>
            <ul className="space-y-3.5 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[#d48997] font-bold">•</span>
                <span>Prefira regras simples para que a sua equipe consiga explicar a vantagem rapidamente.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d48997] font-bold">•</span>
                <span>Ofereça recompensas atrativas, como serviços de valor agregado em vez de pequenos descontos.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#d48997] font-bold">•</span>
                <span>Se optar por cashback, defina um percentual sustentável (geralmente entre 2% e 5%).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
