import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Users } from 'lucide-react';
import { getDatasDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function intersectDateLists(lists) {
  if (!lists.length) return [];
  const [first, ...rest] = lists;
  return first.filter((date) => rest.every((list) => list.includes(date)));
}

export default function StepData({ booking, set, next, cor }) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [mais, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [datasDisponiveis, setDatasDisponiveis] = useState([]);
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(true);
  const [erroDisponibilidade, setErroDisponibilidade] = useState('');

  const primeiroDia = new Date(ano, mais, 1).getDay();
  const diasNoMes = new Date(ano, mais + 1, 0).getDate();
  const datasDisponiveisSet = useMemo(() => new Set(datasDisponiveis), [datasDisponiveis]);

  function formatarData(d) {
    return `${ano}-${String(mais + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function isPast(d) {
    const dt = new Date(ano, mais, d);
    return dt < hoje;
  }

  function isDisponivel(d) {
    return datasDisponiveisSet.has(formatarData(d));
  }

  function selecionar(d) {
    if (isPast(d) || !isDisponivel(d)) return;
    const dataEscolhida = formatarData(d);
    set('data', dataEscolhida);
    if (booking.multiProfissional) {
      set('multiItens', (booking.multiItens || []).map((item) => ({
        ...item,
        data: dataEscolhida,
        hora: '',
      })));
    }
    set('hora', '');
    next();
  }

  function mesAnterior() {
    if (mais === 0) {
      setMes(11);
      setAno((current) => current - 1);
      return;
    }
    setMes((current) => current - 1);
  }

  function proximoMes() {
    if (mais === 11) {
      setMes(0);
      setAno((current) => current + 1);
      return;
    }
    setMes((current) => current + 1);
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        setLoadingDisponibilidade(true);
        setErroDisponibilidade('');

        if (booking.multiProfissional) {
          const itens = booking.multiItens || [];
          if (!itens.length) {
            setDatasDisponiveis([]);
            return;
          }

          const respostas = await Promise.all(itens.map((item) =>
            getDatasDisponiveis(booking.slug, {
              profissionalId: item.profissionalId,
              servicoId: item.servicoId,
              ano,
              mes: mais + 1,
            })
          ));

          if (cancelado) return;
          const listas = respostas.map((response) => response.data || []);
          setDatasDisponiveis(intersectDateLists(listas));
          return;
        }

        if (!booking.profissional?.id || !booking.servicos?.length) {
          setDatasDisponiveis([]);
          return;
        }

        const isPacote = booking.servicos[0]?.isPacote;
        const params = {
          profissionalId: booking.profissional.id,
          ano,
          mes: mais + 1,
          ...(isPacote ? { pacoteId: booking.servicos[0].id } : { servicoIds: booking.servicos.map((item) => item.id) }),
        };

        const response = await getDatasDisponiveis(booking.slug, params);
        if (cancelado) return;
        setDatasDisponiveis(response.data || []);
      } catch (error) {
        if (cancelado) return;
        setDatasDisponiveis([]);
        setErroDisponibilidade(error.response?.data?.error || 'Nao foi possivel consultar a agenda desta selecao.');
      } finally {
        if (!cancelado) setLoadingDisponibilidade(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [booking.slug, booking.profissional?.id, booking.servicos, booking.multiProfissional, booking.multiItens, ano, mais]);

  const dataAtual = booking.data
    ? new Date(`${booking.data}T00:00:00`)
    : null;

  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center gap-5 rounded-[2rem] border border-[#d4af37]/20 bg-black/40 p-5 backdrop-blur-md">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/60 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          {booking.multiProfissional ? (
            <Users size={24} className="text-[#d4af37]" />
          ) : booking.profissional?.fotoUrl ? (
            <img src={booking.profissional.fotoUrl} alt={booking.profissional.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/40 text-[#8a6c74]">
              <User size={24} />
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#b299a0]">
            {booking.multiProfissional ? 'Com equipe' : 'Agendando com'}
          </p>
          <p className="text-lg font-brand-display font-black uppercase leading-none tracking-tight text-[#f4ecd8]">
            {booking.multiProfissional ? 'Especialistas por serviço' : booking.profissional?.nome}
          </p>
        </div>
      </div>

      <div className="glass-card-neon overflow-hidden rounded-[2.5rem]">
        <div className="relative overflow-hidden bg-black/60 p-8 border-b border-[#d4af37]/20">
          <div className="absolute right-0 top-0 h-40 w-40 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#d4af37]/10 blur-[40px]" />

          <div className="relative z-10 flex items-center justify-between">
            <button
              onClick={mesAnterior}
              disabled={ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mais <= hoje.getMonth())}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 transition-all text-[#f4ecd8] disabled:opacity-30 disabled:cursor-not-allowed",
                !(ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mais <= hoje.getMonth())) && "hover:bg-[#d4af37]/10 active:scale-95"
              )}
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>

            <div className="text-center">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#b299a0]">{ano}</p>
              <h3 className="text-xl font-brand-display font-black uppercase tracking-widest text-[#d4af37]">{MESES[mais]}</h3>
            </div>

            <button
              onClick={proximoMes}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 transition-all hover:bg-[#d4af37]/10 active:scale-95 text-[#f4ecd8]"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="p-8 bg-black/20">
          <div className="mb-6 grid grid-cols-7 gap-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-[#8a6c74]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}

            {Array.from({ length: diasNoMes }).map((_, i) => {
              const d = i + 1;
              const past = isPast(d);
              const disponivel = isDisponivel(d);
              const disabled = past || !disponivel || loadingDisponibilidade;
              const selecionado = dataAtual
                && dataAtual.getDate() === d
                && dataAtual.getMonth() === mais
                && dataAtual.getFullYear() === ano;

              return (
                <motion.button
                  key={d}
                  whileHover={!disabled ? { scale: 1.15, y: -2 } : {}}
                  whileTap={!disabled ? { scale: 0.95 } : {}}
                  onClick={() => selecionar(d)}
                  disabled={disabled}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm font-black transition-all',
                    selecionado ? 'z-10 border border-[#d4af37]' : !disabled ? 'hover:bg-[#d4af37]/10 border border-transparent hover:border-[#d4af37]/30' : ''
                  )}
                  style={{
                    backgroundColor: selecionado ? '#d4af37' : 'transparent',
                    boxShadow: selecionado ? '0 15px 30px -10px rgba(212,175,55,0.4)' : 'none',
                    color: selecionado ? '#000' : past ? '#3b2a35' : !disponivel ? '#5d4d57' : '#f4ecd8',
                    opacity: loadingDisponibilidade && !past ? 0.45 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="relative z-10">{d}</span>
                  {!past && !selecionado && disponivel && (
                    <div className="relative z-10 mt-1 h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#8a6c74]">
        <CalendarIcon size={12} className={loadingDisponibilidade ? 'animate-pulse text-[#d4af37]' : ''} />
        {loadingDisponibilidade ? 'Consultando agenda...' : 'Selecione uma data para o atendimento'}
      </div>

      {erroDisponibilidade && (
        <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 px-6 py-5 text-center text-[11px] font-black uppercase tracking-[0.1em] text-rose-400 backdrop-blur-md">
          {erroDisponibilidade}
        </div>
      )}
    </div>
  );
}
