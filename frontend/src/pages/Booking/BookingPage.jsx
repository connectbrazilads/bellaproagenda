import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, MapPin, Phone, Scissors, Sparkles, Tag, User } from 'lucide-react';
import { getProfissionaisPublicos, getSalaoPublico } from '../../services/api';
import { cn } from '../../lib/utils';
import BrandLogo from '../../components/BrandLogo';
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

  const cor = salao?.corPrimaria || '#e29ba8';
  const corSecundaria = salao?.corSecundaria || '#3b2a35';
  const isLight = salao?.tema === 'light';

  function next() {
    setStep((current) => current + 1);
  }

  function back() {
    setStep((current) => current - 1);
  }

  function set(field, value) {
    setBooking((current) => ({
      ...current,
      [field]: typeof value === 'function' ? value(current[field]) : value,
    }));
  }

  if (agendamentoCriado) {
    return <StepSucesso agendamento={agendamentoCriado} salao={salao} cor={cor} />;
  }

  if (loadingSalao) {
    return (
      <div className="brand-page-dark flex min-h-screen items-center justify-center px-6">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex justify-center">
            <BrandLogo />
          </div>
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-white/10 border-t-[#e29ba8] animate-spin" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#efb1bb]">Carregando agenda</p>
            <p className="mt-2 text-sm text-white/55">Estamos preparando a experiência de reserva.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="brand-page-dark flex min-h-screen items-center justify-center px-6">
        <div className="brand-panel-dark w-full max-w-md rounded-[2.4rem] p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-white/6">
            <MapPin className="h-8 w-8 text-[#efb1bb]" />
          </div>
          <h1 className="text-3xl font-brand-display text-white">Link indisponível</h1>
          <p className="mt-4 leading-relaxed text-white/58">{loadError}</p>
        </div>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className={cn('relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 transition-colors sm:px-6', isLight ? 'bg-white text-gray-900' : 'bg-[#050505] text-white')}>
        <div className="absolute inset-0">
          <div className="absolute -left-[10%] -top-[10%] h-[55%] w-[55%] rounded-full opacity-20 blur-[120px]" style={{ backgroundColor: cor }} />
          <div className="absolute -bottom-[10%] -right-[10%] h-[55%] w-[55%] rounded-full opacity-10 blur-[140px]" style={{ backgroundColor: corSecundaria }} />
          {salao?.bannerUrl && (
            <>
              <img src={salao.bannerUrl} className="h-full w-full object-cover opacity-30" alt="Banner do salão" />
              <div className={cn('absolute inset-0 backdrop-blur-[4px]', isLight ? 'bg-white/70' : 'bg-black/45')} />
            </>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
          <div className="relative mb-8 md:mb-10">
            {salao?.logoUrl ? (
              <img src={salao.logoUrl} className="h-24 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.45)]" alt={`Logo ${salao.nome}`} />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] text-5xl font-black text-white shadow-2xl" style={{ backgroundColor: cor }}>
                {salao?.nome?.charAt(0) || 'B'}
              </div>
            )}
            <Sparkles className="absolute -right-3 -top-3 h-7 w-7 text-amber-400" />
          </div>

          <h1 className="text-5xl font-brand-display leading-none sm:text-6xl md:text-7xl xl:text-8xl">{salao?.nome || 'BellaPro'}</h1>
          <p className={cn('mt-5 max-w-2xl text-base leading-relaxed sm:text-lg md:text-2xl', isLight ? 'text-gray-600' : 'text-white/72')}>
            {salao?.bannerTexto || `Reserve seu horário com praticidade em ${salao?.nome || 'nossa unidade'}.`}
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-7">
            <button
              onClick={next}
              style={{ backgroundColor: cor }}
              className="group relative w-full overflow-hidden rounded-[2rem] px-8 py-5 text-sm font-black uppercase tracking-[0.24em] text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] transition hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:min-w-[320px]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative z-10 inline-flex items-center gap-3">
                Agendar agora
                <Scissors className="h-5 w-5" />
              </span>
            </button>

            <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              {salao?.endereco && (
                <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] sm:w-auto">
                  <MapPin className="h-4 w-4 shrink-0 text-white/48" />
                  <span>{salao.endereco}</span>
                </div>
              )}
              {salao?.telefone && (
                <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] sm:w-auto">
                  <Phone className="h-4 w-4 shrink-0 text-white/48" />
                  <span>{salao.telefone}</span>
                </div>
              )}
            </div>

            {profissionaisVitrine.length > 0 && (
              <div className="w-full max-w-5xl space-y-4 pt-3">
                <div className="flex items-center justify-center gap-3">
                  <div className={cn('h-px max-w-20 flex-1', isLight ? 'bg-gray-200' : 'bg-white/10')} />
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.3em]', isLight ? 'text-gray-500' : 'text-white/45')}>
                    Especialistas do salão
                  </p>
                  <div className={cn('h-px max-w-20 flex-1', isLight ? 'bg-gray-200' : 'bg-white/10')} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {profissionaisVitrine.map((profissional) => (
                    <div key={profissional.id} className={cn('group relative overflow-hidden rounded-[2.5rem] border p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1', isLight ? 'border-white/40 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]' : 'border-white/10 bg-[#1A1A1F]/80 shadow-2xl backdrop-blur-2xl hover:border-white/20')}>
                      <div className="flex items-center gap-4">
                        <div className={cn('h-14 w-14 overflow-hidden rounded-[1.2rem] border', isLight ? 'border-gray-200 bg-gray-100' : 'border-white/10 bg-white/5')}>
                          {profissional.fotoUrl ? (
                            <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              <User size={24} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className={cn('text-sm font-black uppercase tracking-[0.16em]', isLight ? 'text-gray-900' : 'text-white')}>
                            {profissional.nome}
                          </p>
                          <p className={cn('mt-1 text-xs leading-relaxed', isLight ? 'text-gray-500' : 'text-white/55')}>
                            {profissional.bio || 'Especialista disponível para agendamento online.'}
                          </p>
                        </div>
                      </div>

                      {profissional.categorias?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {profissional.categorias.slice(0, 3).map((item) => (
                            <span key={item.categoria?.id || item.categoriaId} className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em]', isLight ? 'bg-rose-50 text-rose-700' : 'bg-[#e29ba81a] text-[#f4c5cd]')}>
                              <Tag size={10} />
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
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[radial-gradient(circle_at_top_left,rgba(247,193,182,0.25),transparent_35%),radial-gradient(circle_at_top_right,rgba(226,155,168,0.2),transparent_30%),#faf7f6] px-3 py-6 selection:bg-[#e29ba833] sm:px-4 md:py-12">
      <div className="w-full max-w-2xl space-y-5 md:space-y-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={back} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#f0dfdc] bg-white text-[#a58690] shadow-lg shadow-[#d9b8ba33] transition hover:text-[#1a1a1f] sm:h-14 sm:w-14">
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={3} />
          </motion.button>

          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#a58690]">
              Passo {step + 1} de {STEPS.length}
            </p>
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate text-xl font-black tracking-tight text-gray-900 sm:text-2xl md:text-3xl">{STEPS[step]}</h2>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#f0dfdc] bg-white p-2 shadow-lg shadow-[#d9b8ba33] sm:h-12 sm:w-12">
                {salao?.logoUrl ? (
                  <img src={salao.logoUrl} className="h-full w-full object-contain" alt={`Logo ${salao.nome}`} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: cor }}>
                    {salao?.nome?.charAt(0) || 'B'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-1">
          <div className="h-2 overflow-hidden rounded-full border border-[#f0dfdc] bg-white">
            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} style={{ backgroundColor: cor }} />
          </div>
        </div>

        <motion.div layout className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-white/70 p-5 shadow-[0_30px_70px_-20px_rgba(59,42,53,0.12)] backdrop-blur-xl sm:p-6 md:rounded-[3rem] md:p-10">
          <div className="absolute left-0 top-0 h-2 w-full" style={{ backgroundColor: cor }} />

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="flex min-h-[320px] flex-col md:min-h-[380px]">
              {step === 0 && <StepServico booking={booking} set={set} next={next} cor={cor} />}
              {step === 1 && <StepProfissional booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 2 && <StepData booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 3 && <StepHorario booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 4 && <StepDados booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 5 && <StepConfirmacao booking={booking} back={back} cor={cor} salao={salao} onSuccess={setAgendamentoCriado} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="px-4 text-center text-[10px] font-black uppercase tracking-[0.24em] text-[#b299a0]">
          Experiência BellaPro · {salao?.nome}
        </p>
      </div>
    </div>
  );
}
