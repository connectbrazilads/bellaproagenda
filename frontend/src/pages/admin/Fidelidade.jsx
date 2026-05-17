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

const TIPO_OPCOES = [
  {
    id: 'cashback',
    titulo: 'Cashback premium',
    descricao: 'Devolva um percentual para a cliente usar em futuras visitas.',
    exemplo: 'Ex.: a cada atendimento, 5% volta como credito.',
  },
  {
    id: 'pontos',
    titulo: 'Clube de pontos',
    descricao: 'Transforme consumo recorrente em beneficios e resgates.',
    exemplo: 'Ex.: a cada R$ 1 gasto, a cliente acumula pontos.',
  },
];

function Badge({ active, children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        active
          ? 'bg-[rgba(233,155,168,0.16)] text-[#f7c1b6]'
          : 'bg-[rgba(255,255,255,0.04)] text-[#9f848d]'
      }`}
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
        titulo: 'Programa pausado',
        descricao:
          'Ative a fidelidade para apresentar recompensas automaticamente no relacionamento com suas clientes.',
        destaque: 'Inativo',
      };
    }

    if (form.fidelidadeTipo === 'cashback') {
      return {
        titulo: 'Cashback inteligente',
        descricao: `A cliente recebe ${form.fidelidadeRegra || '0'}% de volta em credito para usar em novos atendimentos.`,
        destaque: `${form.fidelidadeRegra || '0'}% de retorno`,
      };
    }

    return {
      titulo: 'Clube de pontos',
      descricao: `A cada compra, a cliente acumula pontos ate atingir ${form.fidelidadeMeta || 0} e desbloquear ${form.fidelidadePremio || 'um premio especial'}.`,
      destaque: `${form.fidelidadeMeta || 0} pontos`,
    };
  }, [form]);

  async function salvar() {
    setSalvando(true);
    try {
      await updateFidelidadeConfig(form);
      window.alert('Configuracoes de fidelidade salvas com sucesso.');
    } catch {
      window.alert('Nao foi possivel salvar as configuracoes agora.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[rgba(233,155,168,0.25)] border-t-[#e99ba8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 md:p-8 pb-16">
      <section className="flex flex-col gap-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#E29BA8]">
            <Award className="h-4 w-4" />
            Retencao e recorrencia
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Programa de <span className="text-[#E29BA8]">Fidelidade</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Estruture recompensas com a linguagem BellaPro: claras para a cliente, simples para a equipe e sustentaveis para o caixa.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar estrategia'}
        </button>
      </section>

      <section className="grid gap-4 sm:p-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.26)] lg:p-8">
            <div className="flex flex-col gap-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-[24px] ${
                    form.fidelidadeAtiva
                      ? 'bg-[rgba(233,155,168,0.16)] text-[#f7c1b6]'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#8f7880]'
                  }`}
                >
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#E29BA8]">
                    Status do programa
                  </p>
                  <h2 className="mt-2 font-['Playfair_Display'] text-3xl text-[#faf7f6]">
                    {form.fidelidadeAtiva ? 'Programa ativo' : 'Programa desativado'}
                  </h2>
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
                className={`relative h-11 w-24 rounded-full transition ${
                  form.fidelidadeAtiva ? 'bg-[#e99ba8]' : 'bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                <motion.span
                  animate={{ x: form.fidelidadeAtiva ? 50 : 4 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  className="absolute top-[4px] flex h-9 w-9 items-center justify-center rounded-full bg-[#faf7f6] text-[#20191f] shadow-lg"
                >
                  <Zap className="h-4 w-4" />
                </motion.span>
              </button>
            </div>
          </div>

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
                  className={`rounded-[2rem] border p-4 sm:p-6 text-left transition ${
                    active
                      ? 'border-[rgba(233,155,168,0.28)] bg-[rgba(59,42,53,0.82)] shadow-[0_24px_60px_rgba(0,0,0,0.22)]'
                      : 'border-gray-200 dark:border-white/5 bg-[rgba(33,26,31,0.9)] hover:border-[rgba(233,155,168,0.18)]'
                  }`}
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]">
                    {tipo.id === 'cashback' ? <Gift className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-['Playfair_Display'] text-2xl text-[#faf7f6]">
                        {tipo.titulo}
                      </h3>
                      <Badge active={active}>{active ? 'Selecionado' : 'Disponivel'}</Badge>
                    </div>
                    <p className="text-sm leading-7 text-[#c7adb4]">{tipo.descricao}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9f848d]">{tipo.exemplo}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.26)] lg:p-8">
            <div className="mb-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#E29BA8]">
              <Info className="h-4 w-4" />
              Parametros da regra
            </div>

            <div className="grid gap-4 sm:p-6 md:grid-cols-2">
              <label className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                  {form.fidelidadeTipo === 'cashback'
                    ? 'Percentual de retorno'
                    : 'Pontos por real'}
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
                  placeholder={form.fidelidadeTipo === 'cashback' ? 'Ex.: 5' : 'Ex.: 1'}
                  className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.65)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                />
              </label>

              <label className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                  Meta para resgate
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
                  className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.65)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                />
              </label>
            </div>

            <label className="mt-6 block space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                Descricao do premio
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
                placeholder="Ex.: hidratacao premium, desconto progressivo ou servico cortesia"
                className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.65)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
              />
            </label>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(233,155,168,0.18)] bg-[linear-gradient(180deg,rgba(59,42,53,0.96),rgba(24,20,27,0.96))] p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(233,155,168,0.14)] text-[#f7c1b6]">
                <Award className="h-5 w-5" />
              </div>
              <Badge active>{preview.destaque}</Badge>
            </div>

            <h3 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">{preview.titulo}</h3>
            <p className="mt-4 text-sm leading-7 text-[#d4bcc2]">{preview.descricao}</p>

            <div className="mt-8 rounded-[24px] border border-gray-200 dark:border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9f848d]">
                Exemplo de impacto
              </p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold text-[#faf7f6]">
                    {form.fidelidadeTipo === 'cashback' ? 'R$ 24,90' : `${form.fidelidadeMeta || 0} pts`}
                  </p>
                  <p className="mt-2 text-sm text-[#c7adb4]">
                    Percepcao de valor para reforcar retorno e recorrencia.
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-[#f7c1b6]" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.88)] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3 text-[#f7c1b6]">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.22em]">
                Boas praticas
              </span>
            </div>
            <div className="space-y-4 text-sm leading-7 text-[#c7adb4]">
              <p>Prefira regras simples para que a equipe explique o beneficio sem atrito.</p>
              <p>Evite premios muito vagos. Descreva o que a cliente ganha e quando pode usar.</p>
              <p>Se usar cashback, defina um percentual financeiramente sustentavel para o seu ticket medio.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
