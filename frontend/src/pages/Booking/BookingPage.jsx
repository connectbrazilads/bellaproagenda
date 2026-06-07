import { useCallback, useEffect, useState } from 'react';
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 transition-colors bg-[#0a0a0c] text-white sm:px-6">
        <div className="absolute inset-0 grid-overlay opacity-30" />
        <div className="absolute inset-0">
          <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full opacity-15 blur-[120px]" style={{ backgroundColor: cor }} />
          <div className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full opacity-15 blur-[140px]" style={{ backgroundColor: '#d4af37' /* Gold */ }} />
          {salao?.bannerUrl && (
            <>
              <img src={salao.bannerUrl} className="h-full w-full object-cover opacity-[0.15]" alt="Banner do salão" />
              <div className="absolute inset-0 backdrop-blur-[6px] bg-gradient-to-b from-[#0a0a0c]/80 via-[#0a0a0c]/60 to-[#0a0a0c]" />
            </>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
          <div className="relative mb-10 md:mb-12">
            {salao?.logoUrl ? (
              <img src={salao.logoUrl} className="h-28 object-contain drop-shadow-[0_20px_50px_rgba(212,175,55,0.15)]" alt={`Logo ${salao.nome}`} />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] text-6xl font-brand-display font-black text-[#d4af37] shadow-2xl border border-[#d4af37]/30 bg-black/40 backdrop-blur-xl">
                {salao?.nome?.charAt(0) || 'B'}
              </div>
            )}
            <Sparkles className="absolute -right-4 -top-4 h-8 w-8 text-[#d4af37] animate-pulse-slow" />
          </div>

          <h1 className="text-5xl font-brand-display leading-tight sm:text-6xl md:text-7xl xl:text-8xl tracking-tight text-gradient">
            {salao?.nome || 'BellaPro'}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg md:text-2xl text-[#b299a0] font-light">
            {salao?.bannerTexto || `Reserve seu horário com exclusividade em ${salao?.nome || 'nossa unidade'}.`}
          </p>

          <div className="mt-12 flex w-full flex-col items-center gap-8">
            <button
              onClick={next}
              className="premium-btn-primary group relative w-full overflow-hidden px-10 py-5 text-sm font-black uppercase tracking-[0.3em] sm:w-auto sm:min-w-[340px]"
            >
              <span className="relative z-10 inline-flex items-center gap-4">
                Reservar Horário
                <Scissors className="h-5 w-5" />
              </span>
            </button>

            <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
              {salao?.endereco && (
                <div className="flex w-full items-center justify-center gap-3 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] sm:w-auto text-[#e2d5cc]">
                  <MapPin className="h-4 w-4 shrink-0 text-[#d4af37]" />
                  <span>{salao.endereco}</span>
                </div>
              )}
              {salao?.telefone && (
                <div className="flex w-full items-center justify-center gap-3 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] sm:w-auto text-[#e2d5cc]">
                  <Phone className="h-4 w-4 shrink-0 text-[#d4af37]" />
                  <span>{salao.telefone}</span>
                </div>
              )}
            </div>

            {profissionaisVitrine.length > 0 && (
              <div className="w-full max-w-5xl space-y-6 pt-8">
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px max-w-24 flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/40" />
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#d4af37]">
                    Nossos Especialistas
                  </p>
                  <div className="h-px max-w-24 flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/40" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {profissionaisVitrine.map((profissional) => (
                    <div key={profissional.id} className="glass-card-neon group relative overflow-hidden rounded-[2rem] p-6 text-left">
                      <div className="flex items-center gap-5">
                        <div className="h-16 w-16 overflow-hidden rounded-[1.2rem] border border-[#d4af37]/20 bg-black/40">
                          {profissional.fotoUrl ? (
                            <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#d4af37]/50">
                              <User size={26} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f4ecd8]">
                            {profissional.nome}
                          </p>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-[#b299a0]">
                            {profissional.bio || 'Especialista disponível.'}
                          </p>
                        </div>
                      </div>

                      {profissional.categorias?.length > 0 && (
                         <div className="mt-5 flex flex-wrap gap-2">
                           {profissional.categorias.slice(0, 3).map((item) => (
                             <span key={item.categoria?.id || item.categoriaId} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#e2d5cc]">
                               <Tag size={10} className="text-[#d4af37]" />
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
    <div className="flex min-h-screen flex-col items-center bg-[#0a0a0c] px-3 py-6 selection:bg-[#d4af37]/30 sm:px-4 md:py-12 relative overflow-hidden">
      <div className="absolute inset-0 grid-overlay opacity-30" />
      <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full opacity-10 blur-[120px]" style={{ backgroundColor: cor }} />
      <div className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full opacity-10 blur-[140px]" style={{ backgroundColor: '#d4af37' }} />
      
      <div className="w-full max-w-2xl space-y-6 md:space-y-8 relative z-10">
        <div className="flex items-center gap-4 sm:gap-5">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={back} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-black/40 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md transition hover:bg-[#d4af37]/10 sm:h-14 sm:w-14">
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
          </motion.button>

          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.35em] text-[#b299a0]">
              Passo {step + 1} de {STEPS.length}
            </p>
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate text-2xl font-brand-display tracking-tight text-[#f4ecd8] sm:text-3xl md:text-4xl">{STEPS[step]}</h2>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-black/40 p-2 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md sm:h-14 sm:w-14">
                {salao?.logoUrl ? (
                  <img src={salao.logoUrl} className="h-full w-full object-contain" alt={`Logo ${salao.nome}`} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl text-lg font-brand-display font-black text-[#d4af37]">
                    {salao?.nome?.charAt(0) || 'B'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-1">
          <div className="h-1.5 overflow-hidden rounded-full border border-[#d4af37]/20 bg-black/50">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[#d4af37]/60 to-[#d4af37]" initial={{ width: 0 }} animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <motion.div layout className="glass-card-premium relative overflow-hidden rounded-[2.5rem] p-5 sm:p-7 md:rounded-[3rem] md:p-10">
          <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex min-h-[340px] flex-col md:min-h-[400px]">
              {step === 0 && <StepServico booking={booking} set={set} next={next} cor={cor} />}
              {step === 1 && <StepProfissional booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 2 && <StepData booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 3 && <StepHorario booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 4 && <StepDados booking={booking} set={set} next={next} back={back} cor={cor} />}
              {step === 5 && <StepConfirmacao booking={booking} back={back} cor={cor} salao={salao} onSuccess={setAgendamentoCriado} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="px-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">
          Premium Experience · {salao?.nome}
        </p>
      </div>
    </div>
  );
}
