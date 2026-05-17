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

const SECOES = [
  {
    id: 'infoFaq',
    titulo: 'FAQ',
    subtitulo: 'Perguntas frequentes',
    descricao:
      'Ensine a IA a responder as principais duvidas do seu salao com linguagem clara e padrao de atendimento.',
    placeholder:
      'Ex.: Voces atendem por ordem de chegada?\nNao. Trabalhamos somente com agendamento.\n\nPosso remarcar?\nSim. Aceitamos remarcacao com ate 2 horas de antecedencia.',
    icon: HelpCircle,
    accent: 'from-[rgba(233,155,168,0.28)] to-[rgba(247,193,182,0.1)]',
  },
  {
    id: 'infoPoliticas',
    titulo: 'Politicas e procedimentos',
    subtitulo: 'Regras internas',
    descricao:
      'Cadastre politicas de atraso, cancelamento, atendimento, higiene e fluxo operacional.',
    placeholder:
      'Ex.: Tolerancia maxima de 10 minutos de atraso.\nCancelamentos no mesmo dia ficam sujeitos a nova confirmacao.\nNao atendemos menores sem responsavel.',
    icon: ClipboardList,
    accent: 'from-[rgba(59,42,53,0.78)] to-[rgba(233,155,168,0.12)]',
  },
  {
    id: 'infoPromocoes',
    titulo: 'Promocoes e campanhas',
    subtitulo: 'Ofertas ativas',
    descricao:
      'Descreva combos, descontos e regras comerciais para que a IA apresente ofertas corretamente.',
    placeholder:
      'Ex.: Escova + hidratacao com 15% de desconto nas tercas.\nClientes novos ganham avaliacao capilar gratuita.',
    icon: PartyPopper,
    accent: 'from-[rgba(247,193,182,0.22)] to-[rgba(233,155,168,0.08)]',
  },
  {
    id: 'infoRegras',
    titulo: 'Regras de negocio',
    subtitulo: 'Diretrizes gerais',
    descricao:
      'Informe orientacoes importantes para evitar respostas ambiguas em casos especiais.',
    placeholder:
      'Ex.: Nao prometemos horario sem confirmar disponibilidade.\nPacotes devem ser oferecidos somente quando houver aderencia ao perfil da cliente.',
    icon: Pin,
    accent: 'from-[rgba(250,247,246,0.18)] to-[rgba(233,155,168,0.08)]',
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
          setMensagem('Nao foi possivel carregar a base de conhecimento.');
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
      setMensagem('Nao foi possivel salvar agora. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(233,155,168,0.18),transparent_28%),#161319] px-4 py-6 text-[#faf7f6] sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:p-8">
        <section className="flex flex-col gap-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.45em] text-[#E29BA8]">
              <Brain className="h-4 w-4" />
              Nucleo de inteligencia
            </div>
            <div className="space-y-4">
              <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
                Base de <span className="text-[#E29BA8]">Conhecimento</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
                Treine sua IA com o contexto do salao para responder duvidas, apresentar ofertas e manter a comunicacao alinhada com a marca.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-4 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-7 text-sm font-semibold uppercase tracking-[0.24em] text-[#211a1f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {salvando ? 'Salvando...' : 'Salvar treinamento'}
            </button>
            <div className="rounded-[24px] border border-gray-200 dark:border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-4 text-sm leading-6 text-[#c7adb4]">
              A IA utiliza estes blocos como base para respostas automáticas e suporte operacional.
            </div>
          </div>
        </section>

        {mensagem ? (
          <div className="rounded-[24px] border border-[rgba(233,155,168,0.25)] bg-[rgba(233,155,168,0.1)] px-5 py-4 text-sm text-[#f7c1b6]">
            {mensagem}
          </div>
        ) : null}

        <section className="grid gap-4 sm:p-6 lg:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="space-y-4">
            {SECOES.map((secao) => {
              const Icon = secao.icon;
              const ativa = secao.id === abaAtiva;

              return (
                <button
                  key={secao.id}
                  type="button"
                  onClick={() => setAbaAtiva(secao.id)}
                  className={`group flex w-full items-center gap-4 rounded-[28px] border px-5 py-5 text-left transition ${
                    ativa
                      ? 'border-[rgba(233,155,168,0.35)] bg-[rgba(59,42,53,0.78)] shadow-[0_24px_60px_rgba(0,0,0,0.28)]'
                      : 'border-gray-200 dark:border-white/5 bg-[rgba(33,26,31,0.88)] hover:border-[rgba(233,155,168,0.2)] hover:bg-[rgba(42,33,39,0.92)]'
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(233,155,168,0.14)] text-[#f7c1b6]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#faf7f6]">
                      {secao.titulo}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#a98a93]">
                      {secao.subtitulo}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition ${
                      ativa ? 'text-[#f7c1b6]' : 'text-[#806871] group-hover:text-[#c7adb4]'
                    }`}
                  />
                </button>
              );
            })}

            <div className="rounded-[2rem] border border-[rgba(233,155,168,0.18)] bg-[linear-gradient(180deg,rgba(59,42,53,0.95),rgba(33,26,31,0.95))] p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(233,155,168,0.16)] text-[#f7c1b6]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-['Playfair_Display'] text-2xl text-[#faf7f6]">IA generativa</h3>
              <p className="mt-3 text-sm leading-6 text-[#c7adb4]">
                Quanto mais contexto voce cadastrar, mais natural e util sera a resposta automatica da BellaPro no WhatsApp.
              </p>
            </div>
          </aside>

          <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)] lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={secaoAtiva.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="space-y-8"
              >
                <div className="flex flex-col gap-5 border-b border-gray-200 dark:border-white/5 pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br ${secaoAtiva.accent} text-[#faf7f6]`}
                    >
                      <secaoAtiva.icon className="h-7 w-7" />
                    </div>
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#E29BA8]">
                        Contexto estrategico
                      </div>
                      <h2 className="font-['Playfair_Display'] text-3xl leading-tight text-[#faf7f6]">
                        {secaoAtiva.titulo}
                      </h2>
                      <p className="max-w-2xl text-base leading-7 text-[#c7adb4]">
                        {secaoAtiva.descricao}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full border border-[rgba(233,155,168,0.2)] bg-[rgba(233,155,168,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f7c1b6]">
                    Conteudo ativo
                  </div>
                </div>

                <div className="rounded-[2rem] border border-[rgba(233,155,168,0.16)] bg-[rgba(28,23,31,0.48)] p-5">
                  <label className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#E29BA8]">
                    <Info className="h-4 w-4" />
                    Base de treinamento
                  </label>
                  <textarea
                    value={dados[secaoAtiva.id]}
                    onChange={(e) =>
                      setDados((prev) => ({
                        ...prev,
                        [secaoAtiva.id]: e.target.value,
                      }))
                    }
                    rows={14}
                    placeholder={secaoAtiva.placeholder}
                    className="min-h-[360px] w-full resize-y rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(16,14,19,0.55)] px-5 py-4 text-base leading-8 text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.32)]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[26px] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.72)] p-5">
                    <div className="mb-3 flex items-center gap-3 text-[#f7c1b6]">
                      <Zap className="h-5 w-5" />
                      <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                        Dica de especialista
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[#c7adb4]">
                      Prefira frases curtas, objetivas e com exemplos reais do seu processo. Isso melhora a consistencia das respostas e reduz duvidas ambiguas.
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.72)] p-5">
                    <div className="mb-3 flex items-center gap-3 text-[#f7c1b6]">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                        O que incluir
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[#c7adb4]">
                      Horarios, prazos, restricoes, ofertas vigentes, linguagem da recepcao e regras de excecao sao os blocos que mais ajudam a IA.
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
