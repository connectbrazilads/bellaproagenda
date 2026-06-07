import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Info,
  PartyPopper,
  Pin,
  Save,
  Sparkles,
  Zap,
} from 'lucide-react';
import { getAdminSalao, updateAdminSalao } from '../../services/api';
import { cn } from '../../lib/utils';

const SECOES = [
  {
    id: 'infoFaq',
    titulo: 'FAQ',
    subtitulo: 'Perguntas Frequentes',
    descricao:
      'Ensine a IA a responder as principais dúvidas do seu salão com linguagem clara e padrão de atendimento.',
    placeholder:
      'Ex.: Vocês atendem por ordem de chegada?\nNão. Trabalhamos somente com agendamento.\n\nPosso remarcar?\nSim. Aceitamos remarcação com até 2 horas de antecedência.',
    icon: HelpCircle,
    accent: 'bg-rose-500/10 text-rose-500',
  },
  {
    id: 'infoPoliticas',
    titulo: 'Políticas',
    subtitulo: 'Procedimentos Internos',
    descricao:
      'Cadastre políticas de atraso, cancelamento, atendimento, higiene e fluxo operacional.',
    placeholder:
      'Ex.: Tolerância máxima de 10 minutos de atraso.\nCancelamentos no mesmo dia ficam sujeitos a nova confirmação.\nNão atendemos menores sem responsável.',
    icon: ClipboardList,
    accent: 'bg-amber-500/10 text-amber-500',
  },
  {
    id: 'infoPromocoes',
    titulo: 'Promoções',
    subtitulo: 'Ofertas Ativas',
    descricao:
      'Descreva combos, descontos e regras comerciais para que a IA apresente ofertas corretamente.',
    placeholder:
      'Ex.: Escova + hidratação com 15% de desconto nas terças.\nClientes novos ganham avaliação capilar gratuita.',
    icon: PartyPopper,
    accent: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    id: 'infoRegras',
    titulo: 'Diretrizes',
    subtitulo: 'Regras de Negócio',
    descricao:
      'Informe orientações importantes para evitar respostas ambíguas em casos especiais.',
    placeholder:
      'Ex.: Não prometemos horário sem confirmar disponibilidade.\nPacotes devem ser oferecidos somente quando houver aderência ao perfil da cliente.',
    icon: Pin,
    accent: 'bg-blue-500/10 text-blue-500',
  },
];

const INITIAL_DATA = {
  infoFaq: '',
  infoPoliticas: '',
  infoPromocoes: '',
  infoRegras: '',
};

export default function BaseConhecimento() {
  const [dados, setDados] = useState(INITIAL_DATA);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState(SECOES[0].id);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const salao = await getAdminSalao();
        if (!ativo) return;

        setDados({
          infoFaq: salao?.infoFaq || '',
          infoPoliticas: salao?.infoPoliticas || '',
          infoPromocoes: salao?.infoPromocoes || '',
          infoRegras: salao?.infoRegras || '',
        });
      } catch {
        if (ativo) {
          setMensagem('Não foi possível carregar a base de conhecimento.');
        }
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const secaoAtiva = useMemo(
    () => SECOES.find((secao) => secao.id === abaAtiva) || SECOES[0],
    [abaAtiva]
  );

  async function salvar() {
    setSalvando(true);
    setMensagem('');
    try {
      await updateAdminSalao(dados);
      setMensagem('Base de conhecimento salva com sucesso.');
    } catch {
      setMensagem('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSalvando(false);
    }
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
            <Brain className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Inteligência Artificial</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Base de <span className="text-[#d48997]">Conhecimento</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Treine o assistente virtual com o contexto real do seu salão para responder dúvidas de clientes e agendar horários automaticamente.
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
          {salvando ? 'Salvando...' : 'Salvar Treinamento'}
        </motion.button>
      </header>

      {/* Message alert */}
      {mensagem && (
        <div className="rounded-xl border border-[#d48997]/20 bg-[#d48997]/5 px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
          {mensagem}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid gap-8 lg:grid-cols-[260px,1fr]">
        {/* Navigation Sidebar */}
        <aside className="space-y-3">
          {SECOES.map((secao) => {
            const Icon = secao.icon;
            const ativa = secao.id === abaAtiva;

            return (
              <button
                key={secao.id}
                type="button"
                onClick={() => setAbaAtiva(secao.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all',
                  ativa
                    ? 'border-[#d48997] bg-[#d48997]/5 shadow-sm'
                    : 'border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md hover:border-black/[0.08] dark:hover:border-white/[0.08]'
                )}
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all', secao.accent)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                    {secao.titulo}
                  </h4>
                  <p className="mt-0.5 text-[9px] text-gray-400 dark:text-gray-500 truncate font-medium">
                    {secao.subtitulo}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform',
                    ativa ? 'text-[#d48997] translate-x-0.5' : 'text-gray-400 dark:text-gray-600 group-hover:translate-x-0.5'
                  )}
                />
              </button>
            );
          })}

          {/* AI Banner Card */}
          <div className="rounded-xl border border-[#d48997]/25 bg-gradient-to-br from-[#d48997]/5 to-transparent p-5 space-y-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d48997]/10 text-[#d48997]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-gray-900 dark:text-white">IA Generativa</h4>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                Quanto mais detalhado for o contexto cadastrado nestas seções, mais consistentes e naturais serão as respostas automáticas da IA no WhatsApp.
              </p>
            </div>
          </div>
        </aside>

        {/* Content Box */}
        <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={secaoAtiva.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Active Section Info */}
              <div className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/5 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', secaoAtiva.accent)}>
                    <secaoAtiva.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">
                      {secaoAtiva.subtitulo}
                    </span>
                    <h2 className="mt-0.5 font-serif text-xl font-normal text-gray-900 dark:text-white">
                      {secaoAtiva.titulo}
                    </h2>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
                      {secaoAtiva.descricao}
                    </p>
                  </div>
                </div>
                <div className="inline-flex rounded-lg bg-[#d48997]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#d48997] self-start">
                  Ativo
                </div>
              </div>

              {/* Textarea Area */}
              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#d48997]">
                  <Info className="h-3.5 w-3.5" />
                  Instruções de Treinamento
                </span>
                <textarea
                  value={dados[secaoAtiva.id]}
                  onChange={(e) =>
                    setDados((prev) => ({
                      ...prev,
                      [secaoAtiva.id]: e.target.value,
                    }))
                  }
                  rows={12}
                  placeholder={secaoAtiva.placeholder}
                  className="w-full resize-y rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-4 text-xs leading-relaxed text-gray-800 dark:text-gray-200 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400/70"
                />
              </div>

              {/* Tips Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#d48997]">
                    <Zap className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                      Dica de Especialista
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Prefira frases curtas, objetivas e utilize exemplos de perguntas e respostas reais do seu processo. Isso melhora expressivamente a precisão das conversas.
                  </p>
                </div>

                <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[#d48997]">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                      O que Incluir
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Horários de funcionamento, políticas de atraso/cancelamento, regras de agendamento e informações das ofertas ativas são os blocos mais importantes.
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
