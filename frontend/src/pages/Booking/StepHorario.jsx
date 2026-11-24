import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Coffee, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getHorariosDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

const PERIOD_LABELS = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

function splitPeriods(slots = []) {
  return {
    manha: slots.filter((slot) => parseInt(slot.split(':')[0], 10) < 12),
    tarde: slots.filter((slot) => parseInt(slot.split(':')[0], 10) >= 12 && parseInt(slot.split(':')[0], 10) < 18),
    noite: slots.filter((slot) => parseInt(slot.split(':')[0], 10) >= 18),
  };
}

function HorarioCard({ titulo, slots, selecionado, onSelect }) {
  const periods = splitPeriods(slots);

  return (
    <div className="space-y-5 rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8E7682]">Item da comanda</p>
          <h3 className="mt-0.5 text-base font-bold text-[#23141C]">{titulo}</h3>
        </div>
        {selecionado && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D5DE] bg-white px-3 py-1 text-xs font-bold text-[#B84C6B]">
            <CheckCircle2 size={14} />
            {selecionado}
          </span>
        )}
      </div>

      <div className="space-y-5">
        {Object.entries(periods).map(([name, times]) => times.length > 0 && (
          <div key={name} className="space-y-2.5">
            <div className="flex items-center gap-3">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E7682]">{PERIOD_LABELS[name] || name}</h4>
              <div className="h-px flex-1 bg-[#E2D5DA]" />
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {times.map((hora) => (
                <button
                  key={`${titulo}-${hora}`}
                  type="button"
                  onClick={() => onSelect(hora)}
                  className={cn(
                    'flex min-h-12 items-center justify-center rounded-xl border text-sm font-bold transition',
                    selecionado === hora
                      ? 'border-[#23141C] bg-[#23141C] text-white shadow-sm'
                      : 'border-[#EAE1E4] bg-white text-[#23141C] hover:border-[#B84C6B] hover:bg-[#FDF7F9] hover:text-[#B84C6B]'
                  )}
                >
                  {hora}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StepHorario({ booking, set, next }) {
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
        setErro(error.response?.data?.error || 'Não foi possível consultar os horários desta data.');
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
      <div className="flex flex-col items-center justify-center space-y-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#EAE1E4] border-t-[#B84C6B]" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8E7682]">Consultando agenda</p>
      </div>
    );
  }

  const dataLabel = booking.data
    ? new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })
    : '-';

  if (booking.multiProfissional) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#EAE1E4] bg-white text-[#B84C6B]">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E7682]">Data escolhida</p>
            <p className="text-sm font-bold capitalize text-[#23141C]">{dataLabel}</p>
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em]">Não foi possível carregar os horários</p>
              <p className="mt-1 text-xs">{erro}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {multiItens.map((item) => (
            <HorarioCard
              key={item.servicoId}
              titulo={`${item.servicoNome} · ${item.profissionalNome}`}
              slots={slotsPorItem[item.servicoId] || []}
              selecionado={item.hora}
              onSelect={(hora) => selecionarHoraItem(item.servicoId, hora)}
            />
          ))}
        </div>

        <div className="rounded-xl border border-[#F0D5DE] bg-[#FDF7F9] px-4 py-3 text-center text-xs font-bold text-[#B84C6B]">
          {multiItens.filter((item) => item.hora).length} de {multiItens.length} horários selecionados
        </div>

        <button
          type="button"
          onClick={next}
          disabled={!multiCompleto}
          className="w-full rounded-2xl bg-[#B84C6B] py-4 text-sm font-bold text-white transition hover:bg-[#9E3E5A] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continuar
        </button>
      </div>
    );
  }

  const periods = splitPeriods(slots);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#EAE1E4] bg-white text-[#B84C6B]">
          <Clock size={20} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E7682]">Data escolhida</p>
          <p className="text-sm font-bold capitalize text-[#23141C]">{dataLabel}</p>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em]">Não foi possível carregar os horários</p>
            <p className="mt-1 text-xs">{erro}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(periods).map(([name, times]) => times.length > 0 && (
          <div key={name} className="space-y-3">
            <div className="flex items-center gap-3">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E7682]">{PERIOD_LABELS[name] || name}</h4>
              <div className="h-px flex-1 bg-[#EAE1E4]" />
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {times.map((hora) => (
                <button
                  key={hora}
                  type="button"
                  onClick={() => selecionar(hora)}
                  className={cn(
                    'flex min-h-12 items-center justify-center rounded-xl border text-sm font-bold transition',
                    booking.hora === hora
                      ? 'border-[#23141C] bg-[#23141C] text-white shadow-sm'
                      : 'border-[#EAE1E4] bg-white text-[#23141C] hover:border-[#B84C6B] hover:bg-[#FDF7F9] hover:text-[#B84C6B]'
                  )}
                >
                  {hora}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!erro && slots.length === 0 && (
        <div className="space-y-4 rounded-2xl border border-dashed border-[#D9C6CE] bg-[#FAF7F5] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EAE1E4] bg-white text-[#8E7682]">
            <Coffee size={26} />
          </div>
          <div>
            <p className="font-brand-display text-xl font-semibold text-[#23141C]">Sem horários nesta data</p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-[#6B5761]">
              Não encontramos vagas para este especialista neste dia. Tente outra data no calendário.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
