import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { getDatasDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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
    set('data', formatarData(d));
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
    if (!booking.profissional?.id || !booking.servicos?.length) {
      setDatasDisponiveis([]);
      setLoadingDisponibilidade(false);
      return;
    }

    const isPacote = booking.servicos[0]?.isPacote;
    const params = {
      profissionalId: booking.profissional.id,
      ano,
      mes: mais + 1,
      ...(isPacote ? { pacoteId: booking.servicos[0].id } : { servicoIds: booking.servicos.map((item) => item.id) }),
    };

    let cancelado = false;
    setLoadingDisponibilidade(true);
    setErroDisponibilidade('');

    getDatasDisponiveis(booking.slug, params)
      .then((response) => {
        if (cancelado) return;
        setDatasDisponiveis(response.data || []);
      })
      .catch((error) => {
        if (cancelado) return;
        setDatasDisponiveis([]);
        setErroDisponibilidade(error.response?.data?.error || 'Nao foi possivel consultar a agenda deste profissional.');
      })
      .finally(() => {
        if (!cancelado) setLoadingDisponibilidade(false);
      });

    return () => {
      cancelado = true;
    };
  }, [booking.slug, booking.profissional?.id, booking.servicos, ano, mais]);

  const dataAtual = booking.data
    ? new Date(`${booking.data}T00:00:00`)
    : null;

  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center gap-5 rounded-3xl border border-gray-100/50 bg-gray-50/50 p-5 backdrop-blur-sm">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-50 bg-white shadow-xl">
          {booking.profissional.fotoUrl ? (
            <img src={booking.profissional.fotoUrl} alt={booking.profissional.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300">
              <User size={24} />
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Agendando com</p>
          <p className="text-lg font-black uppercase leading-none tracking-tight text-gray-900">{booking.profissional.nome}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl shadow-gray-200/20">
        <div className="relative overflow-hidden bg-gray-900 p-8 text-white">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">
            <button
              onClick={mesAnterior}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 transition-all hover:bg-white/20 active:scale-95"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>

            <div className="text-center">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{ano}</p>
              <h3 className="text-xl font-black uppercase tracking-widest">{MESES[mais]}</h3>
            </div>

            <button
              onClick={proximoMes}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 transition-all hover:bg-white/20 active:scale-95"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 grid grid-cols-7 gap-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-300">
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
                  whileHover={!disabled ? { scale: 1.1, y: -2 } : {}}
                  whileTap={!disabled ? { scale: 0.95 } : {}}
                  onClick={() => selecionar(d)}
                  disabled={disabled}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-2xl text-sm font-black transition-all',
                    selecionado ? 'z-10 shadow-2xl' : !disabled ? 'hover:bg-gray-50' : ''
                  )}
                  style={{
                    backgroundColor: selecionado ? cor : 'transparent',
                    boxShadow: selecionado ? `0 15px 30px -10px ${cor}88` : 'none',
                    color: selecionado ? 'white' : past ? '#f3f4f6' : !disponivel ? '#d1d5db' : '#1f2937',
                    opacity: loadingDisponibilidade && !past ? 0.45 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {selecionado && (
                    <motion.div
                      layoutId="activeDay"
                      className="absolute inset-0 rounded-2xl"
                      style={{ backgroundColor: cor }}
                    />
                  )}
                  <span className="relative z-10">{d}</span>
                  {!past && !selecionado && disponivel && (
                    <div className="relative z-10 mt-1 h-1 w-1 rounded-full bg-emerald-400" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-300">
        <CalendarIcon size={12} />
        {loadingDisponibilidade ? 'Consultando dias com vaga' : 'Selecione um dia com vaga'}
      </div>

      {erroDisponibilidade && (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-center text-sm font-semibold text-rose-700">
          {erroDisponibilidade}
        </div>
      )}

      {!loadingDisponibilidade && !erroDisponibilidade && datasDisponiveis.length === 0 && (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-4 text-center text-sm font-semibold text-amber-800">
          Nao encontramos horarios livres neste mes para essa selecao. Tente outro mes ou outro profissional.
        </div>
      )}
    </div>
  );
}
