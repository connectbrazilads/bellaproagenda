import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Coffee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getHorariosDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

function splitPeriods(slots = []) {
  return {
    manha: slots.filter((slot) => parseInt(slot.split(':')[0], 10) < 12),
    tarde: slots.filter((slot) => parseInt(slot.split(':')[0], 10) >= 12 && parseInt(slot.split(':')[0], 10) < 18),
    noite: slots.filter((slot) => parseInt(slot.split(':')[0], 10) >= 18),
  };
}

function HorarioCard({ titulo, slots, selecionado, onSelect, cor }) {
  const periods = splitPeriods(slots);

  return (
    <div className="glass-card-neon space-y-8 rounded-[2rem] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Item da comanda</p>
          <h3 className="mt-2 text-lg font-brand-display font-black tracking-tight text-[#f4ecd8]">{titulo}</h3>
        </div>
        {selecionado && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#d4af37]">
            <CheckCircle2 size={14} />
            {selecionado}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(periods).map(([name, times]) => times.length > 0 && (
          <div key={name} className="space-y-4">
            <div className="flex items-center gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d4af37]">{name}</h4>
              <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {times.map((hora) => (
                <button
                  key={`${titulo}-${hora}`}
                  type="button"
                  onClick={() => onSelect(hora)}
                  className={cn(
                    'flex min-h-14 items-center justify-center rounded-2xl border transition-all',
                    selecionado === hora ? 'bg-[#d4af37]/10 border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)] text-[#d4af37]' : 'border-white/10 bg-black/40 text-[#b299a0] hover:border-[#d4af37]/40 hover:text-[#f4ecd8]'
                  )}
                  style={{
                    borderColor: selecionado === hora ? cor : undefined,
                    color: selecionado === hora ? cor : undefined,
                  }}
                >
                  <span className="text-sm font-black tracking-widest">{hora}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StepHorario({ booking, set, next, cor }) {
  const [slots, setSlots] = useState([]);
  const [slotsPorItem, setSlotsPorItem] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const multiItens = booking.multiItens || [];

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        setLoading(true);
        setErro('');

        if (booking.multiProfissional) {
          const respostas = await Promise.all(multiItens.map((item) =>
            getHorariosDisponiveis(booking.slug, {
              profissionalId: item.profissionalId,
              servicoId: item.servicoId,
              data: booking.data,
            })
          ));

          if (cancelado) return;

          const mapa = {};
          respostas.forEach((response, index) => {
            const item = multiItens[index];
            mapa[item.servicoId] = response.data || [];
          });
          setSlotsPorItem(mapa);
          setSlots([]);
          return;
        }

        const isPacote = booking.servicos[0]?.isPacote;
        const params = {
          profissionalId: booking.profissional.id,
          data: booking.data,
          ...(isPacote ? { pacoteId: booking.servicos[0].id } : { servicoIds: booking.servicos.map((item) => item.id) }),
        };

        const response = await getHorariosDisponiveis(booking.slug, params);
        if (cancelado) return;
        setSlots(response.data || []);
      } catch (error) {
        if (cancelado) return;
        setSlots([]);
        setSlotsPorItem({});
        setErro(error.response?.data?.error || 'Nao foi possivel consultar os horarios desta data.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [booking.slug, booking.profissional?.id, booking.servicos, booking.data, booking.multiProfissional, multiItens]);

  const multiCompleto = useMemo(
    () => multiItens.length > 0 && multiItens.every((item) => item.hora),
    [multiItens]
  );

  function selecionar(hora) {
    set('hora', hora);
    next();
  }

  function selecionarHoraItem(servicoId, hora) {
    set('multiItens', multiItens.map((item) => (
      item.servicoId === servicoId
        ? { ...item, hora }
        : item
    )));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d4af37]/10 border-t-[#d4af37]" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Consultando agenda</p>
      </div>
    );
  }

  if (booking.multiProfissional) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-[#d4af37]/20 bg-black/40 p-6 backdrop-blur-md md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-black/60 shadow-lg text-[#d4af37]">
              <Clock size={24} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#b299a0]">Data escolhida</p>
              <p className="text-sm font-brand-display font-black uppercase tracking-tight text-[#f4ecd8]">
                {new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-4 rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-5 text-rose-400 backdrop-blur-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-black/40 shadow-sm">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em]">Não foi possível carregar os horários</p>
              <p className="mt-2 text-[11px] font-light leading-relaxed">{erro}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {multiItens.map((item) => (
            <HorarioCard
              key={item.servicoId}
              titulo={`${item.servicoNome} - ${item.profissionalNome}`}
              slots={slotsPorItem[item.servicoId] || []}
              selecionado={item.hora}
              onSelect={(hora) => selecionarHoraItem(item.servicoId, hora)}
              cor={cor}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 px-5 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37]">
          {multiItens.filter((item) => item.hora).length} de {multiItens.length} horários selecionados
        </div>

        <button
          type="button"
          onClick={next}
          disabled={!multiCompleto}
          className="premium-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:filter-grayscale"
        >
          Revisar comanda
        </button>
      </div>
    );
  }

  const periods = splitPeriods(slots);

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-[#d4af37]/20 bg-black/40 p-6 backdrop-blur-md md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-black/60 shadow-lg text-[#d4af37]">
            <Clock size={24} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#b299a0]">Data escolhida</p>
            <p className="text-sm font-brand-display font-black uppercase tracking-tight text-[#f4ecd8]">
              {new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-4 rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-5 text-rose-400 backdrop-blur-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-black/40 shadow-sm">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]">Não foi possível carregar os horários</p>
            <p className="mt-2 text-[11px] font-light leading-relaxed">{erro}</p>
          </div>
        </div>
      )}

      <div className="space-y-12">
        {Object.entries(periods).map(([name, times], idx) => times.length > 0 && (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d4af37]">{name}</h4>
              <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {times.map((hora) => (
                <motion.button
                  key={hora}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selecionar(hora)}
                  className={cn(
                    'flex min-h-16 items-center justify-center rounded-2xl border transition-all shadow-sm',
                    booking.hora === hora ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.15)]' : 'border-white/10 bg-black/40 text-[#b299a0] hover:border-[#d4af37]/40 hover:text-[#f4ecd8]'
                  )}
                  style={{
                    borderColor: booking.hora === hora ? cor : undefined,
                    color: booking.hora === hora ? cor : undefined,
                  }}
                >
                  <span className="text-sm font-black tracking-widest">{hora}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {!erro && slots.length === 0 && (
        <div className="space-y-5 rounded-[2.5rem] border border-dashed border-white/10 bg-black/40 p-12 text-center backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-black/60 text-[#8a6c74] shadow-lg">
            <Coffee size={32} />
          </div>
          <div>
            <p className="text-lg font-brand-display font-black tracking-tight text-[#f4ecd8]">Sem horários nesta data</p>
            <p className="mx-auto mt-2 max-w-[260px] text-[11px] font-light leading-relaxed text-[#b299a0]">
              Não encontramos vagas para este especialista neste dia. Tente outra data no calendário.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
