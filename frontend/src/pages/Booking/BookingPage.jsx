import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, MapPin, Phone, Scissors, Sparkles, Tag, User } from 'lucide-react';
import { getProfissionaisPublicos, getSalaoPublico } from '../../services/api';
import LandingBrandLogo from '../../components/LandingBrandLogo';
import StepServico from './StepServico';
import StepProfissional from './StepProfissional';
import StepData from './StepData';
import StepHorario from './StepHorario';
import StepDados from './StepDados';
import StepConfirmacao from './StepConfirmacao';
import StepSucesso from './StepSucesso';

const STEPS = ['Serviço', 'Profissional', 'Data', 'Horário', 'Seus dados', 'Confirmação'];

export default function BookingPage({ slug }) {
  const [salao, setSalao] = useState(null);
  const [loadingSalao, setLoadingSalao] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profissionaisVitrine, setProfissionaisVitrine] = useState([]);
  const [step, setStep] = useState(-1);
  const [booking, setBooking] = useState({
    slug,
    servicos: [],
    profissional: null,
    multiProfissional: false,
    multiItens: [],
    data: '',
    hora: '',
    clienteNome: '',
    clienteTelefone: '',
    observacao: '',
  });
  const [agendamentoCriado, setAgendamentoCriado] = useState(null);

  useEffect(() => {
    setBooking((current) => ({ ...current, slug }));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    setLoadingSalao(true);
    setLoadError('');

    Promise.all([getSalaoPublico(slug), getProfissionaisPublicos(slug)])
      .then(([salaoResponse, profissionaisResponse]) => {
        setSalao(salaoResponse.data);
        setProfissionaisVitrine(profissionaisResponse.data || []);
      })
      .catch(() => setLoadError('Não encontramos este salão. Confira o link e tente novamente.'))
      .finally(() => setLoadingSalao(false));
  }, [slug]);

  const cor = salao?.corPrimaria || '#B84C6B';

  function next() {
    setStep((current) => current + 1);
  }

  function back() {
    setStep((current) => current - 1);
  }

  const set = useCallback((field, value) => {
    setBooking((current) => ({
      ...current,
      [field]: typeof value === 'function' ? value(current[field]) : value,
    }));
  }, []);

  if (agendamentoCriado) {
    return <StepSucesso agendamento={agendamentoCriado} salao={salao} cor={cor} />;
  }

  if (loadingSalao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F5] px-6 text-[#23141C]">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex justify-center">
            <LandingBrandLogo variant="lightBg" size="sm" />
          </div>
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-[3px] border-[#EAE1E4] border-t-[#B84C6B]" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Carregando agenda</p>
            <p className="mt-1.5 text-sm text-[#6B5761]">Estamos preparando sua experiência de reserva.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F5] px-6 text-[#23141C]">
        <div className="w-full max-w-md rounded-3xl border border-[#EAE1E4] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF1F4] text-[#B84C6B]">
            <MapPin className="h-7 w-7" />
          </div>
          <h1 className="font-brand-display text-3xl font-semibold text-[#23141C]">Link indisponível</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6B5761]">{loadError}</p>
        </div>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="min-h-screen bg-[#FAF7F5] text-[#23141C]">
        {salao?.bannerUrl && (
          <div className="relative h-48 w-full overflow-hidden border-b border-[#EAE1E4] sm:h-60">
            <img src={salao.bannerUrl} className="h-full w-full object-cover" alt={`Banner ${salao.nome}`} />
            <div className="absolute inset-0 bg-gradient-to-b from-[#23141C]/20 via-transparent to-[#FAF7F5]" />
          </div>
        )}

        <div className={`mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-16 text-center sm:px-6 ${salao?.bannerUrl ? '-mt-16' : 'pt-14 sm:pt-20'}`}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center"
          >
            <div className="relative mb-6">
              {salao?.logoUrl ? (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#EAE1E4] bg-white p-2.5 shadow-sm sm:h-28 sm:w-28">
                  <img src={salao.logoUrl} className="h-full w-full object-contain" alt={`Logo ${salao.nome}`} />
                </div>
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-3xl border border-[#EAE1E4] bg-[#23141C] font-brand-display text-5xl font-bold text-white shadow-sm sm:h-28 sm:w-28"
                >
                  {salao?.nome?.charAt(0) || 'B'}
                </div>
              )}
              <span
                className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#FAF7F5] bg-[#B84C6B] text-white shadow-sm"
                style={{ backgroundColor: cor }}
              >
                <Sparkles className="h-4 w-4" />
              </span>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#EAE1E4] bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#B84C6B]">
              Agendamento Online
            </span>

            <h1 className="mt-5 font-brand-display text-4xl font-semibold tracking-tight text-[#23141C] sm:text-5xl md:text-6xl">
              {salao?.nome || 'BellaPro'}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6B5761] sm:text-lg">
              {salao?.bannerTexto || `Reserve seu horário online com praticidade e exclusividade em ${salao?.nome || 'nossa unidade'}.`}
            </p>

            <div className="mt-8 flex w-full flex-col items-center gap-5">
              <button
                onClick={next}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#23141C] px-8 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#3A222E] active:scale-[0.99] sm:w-auto sm:min-w-[300px]"
              >
                <Scissors className="h-4 w-4 text-[#E6A3B5]" />
                <span>Reservar Horário</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {(salao?.endereco || salao?.telefone) && (
                <div className="flex w-full flex-wrap items-center justify-center gap-3">
                  {salao?.endereco && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#EAE1E4] bg-white px-4 py-2 text-xs font-medium text-[#6B5761]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#B84C6B]" />
                      <span>{salao.endereco}</span>
                    </div>
                  )}
                  {salao?.telefone && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#EAE1E4] bg-white px-4 py-2 text-xs font-medium text-[#6B5761]">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#B84C6B]" />
                      <span>{salao.telefone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {profissionaisVitrine.length > 0 && (
              <div className="mt-14 w-full space-y-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px max-w-20 flex-1 bg-[#E2D5DA]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8E7682]">
                    Nossos Especialistas
                  </p>
                  <div className="h-px max-w-20 flex-1 bg-[#E2D5DA]" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profissionaisVitrine.map((profissional) => (
                    <div
                      key={profissional.id}
                      className="rounded-3xl border border-[#EAE1E4] bg-white p-5 text-left transition hover:border-[#D9C6CE]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5]">
                          {profissional.fotoUrl ? (
                            <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#9E8792]">
                              <User size={22} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#23141C]">
                            {profissional.nome}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6B5761]">
                            {profissional.bio || 'Especialista disponível para atendimento.'}
                          </p>
                        </div>
                      </div>

                      {profissional.categorias?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {profissional.categorias.slice(0, 3).map((item) => (
                            <span
                              key={item.categoria?.id || item.categoriaId}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#EFE7EA] bg-[#FAF7F5] px-3 py-1 text-[10px] font-semibold text-[#6B5761]"
                            >
                              <Tag size={10} className="text-[#B84C6B]" />
                              {item.categoria?.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-14 text-[11px] font-medium text-[#9E8792]">
              Agendamento seguro via <span className="font-semibold text-[#6B5761]">BellaPro Agenda</span>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F5] px-4 py-6 text-[#23141C] sm:px-6 md:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={back}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E2D5DA] bg-white text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B84C6B]">
              Passo {step + 1} de {STEPS.length} · {salao?.nome}
            </p>
            <h2 className="truncate font-brand-display text-2xl font-semibold tracking-tight text-[#23141C] sm:text-3xl">
              {STEPS[step]}
            </h2>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EAE1E4] bg-white p-1.5">
            {salao?.logoUrl ? (
              <img src={salao.logoUrl} className="h-full w-full object-contain" alt={`Logo ${salao.nome}`} />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#23141C] font-brand-display text-base font-bold text-white">
                {salao?.nome?.charAt(0) || 'B'}
              </div>
            )}
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[#EAE1E4]">
          <motion.div
            className="h-full rounded-full bg-[#B84C6B]"
            style={{ backgroundColor: cor }}
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="rounded-3xl border border-[#EAE1E4] bg-white p-5 shadow-sm sm:p-7 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-[320px] flex-col"
            >
              {step === 0 && <StepServico booking={booking} set={set} next={next} cor={cor} />}
              {step === 1 && <StepProfissional booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 2 && <StepData booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 3 && <StepHorario booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 4 && <StepDados booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 5 && <StepConfirmacao booking={booking} back={back} cor={cor} salao={salao} onSuccess={setAgendamentoCriado} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-[#9E8792]">
          {salao?.nome} · Agendamento online via BellaPro
        </p>
      </div>
    </div>
  );
}
