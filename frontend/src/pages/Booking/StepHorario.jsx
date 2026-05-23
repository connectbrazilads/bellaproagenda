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
    <div className="space-y-8 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a58690]">Item da comanda</p>
          <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-gray-900">{titulo}</h3>
        </div>
        {selecionado && (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
            <CheckCircle2 size={14} />
            {selecionado}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(periods).map(([name, times]) => times.length > 0 && (
          <div key={name} className="space-y-4">
            <div className="flex items-center gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900">{name}</h4>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {times.map((hora) => (
                <button
                  key={`${titulo}-${hora}`}
                  type="button"
                  onClick={() => onSelect(hora)}
                  className={cn(
                    'flex min-h-14 items-center justify-center rounded-2xl border-2 text-sm font-black transition-all shadow-sm',
                    selecionado === hora ? 'bg-white shadow-xl' : 'border-gray-50 bg-white text-gray-900 hover:border-purple-500/20'
                  )}
                  style={{
                    borderColor: selecionado === hora ? cor : undefined,
                    color: selecionado === hora ? cor : undefined,
                  }}
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-100 border-t-purple-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Consultando agenda</p>
      </div>
    );
  }

  if (booking.multiProfissional) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-gray-100/50 bg-gray-50/50 p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-purple-600 shadow-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Data escolhida</p>
              <p className="text-sm font-black uppercase tracking-tight text-gray-900">
                {new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-4 rounded-[2rem] border border-rose-100 bg-rose-50 p-5 text-rose-700">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em]">Nao foi possivel carregar os horarios</p>
              <p className="mt-2 text-sm font-medium leading-relaxed">{erro}</p>
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

        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-bold text-gray-500">
          {multiItens.filter((item) => item.hora).length} de {multiItens.length} horarios selecionados
        </div>

        <button
          type="button"
          onClick={next}
          disabled={!multiCompleto}
          style={{ backgroundColor: cor }}
          className="w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-[0.22em] text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          Revisar comanda
        </button>
      </div>
    );
  }

  const periods = splitPeriods(slots);

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-gray-100/50 bg-gray-50/50 p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-purple-600 shadow-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Data escolhida</p>
            <p className="text-sm font-black uppercase tracking-tight text-gray-900">
              {new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-4 rounded-[2rem] border border-rose-100 bg-rose-50 p-5 text-rose-700">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em]">Nao foi possivel carregar os horarios</p>
            <p className="mt-2 text-sm font-medium leading-relaxed">{erro}</p>
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
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-900">{name}</h4>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {times.map((hora) => (
                <motion.button
                  key={hora}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selecionar(hora)}
                  className={cn(
                    'flex min-h-16 items-center justify-center rounded-2xl border-2 text-sm font-black transition-all shadow-sm',
                    booking.hora === hora ? 'border-purple-500 bg-white text-purple-600 shadow-xl shadow-purple-500/10' : 'border-gray-50 bg-white text-gray-900 hover:border-purple-500/20'
                  )}
                  style={{
                    borderColor: booking.hora === hora ? cor : undefined,
                    color: booking.hora === hora ? cor : undefined,
                  }}
                >
                  {hora}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {!erro && slots.length === 0 && (
        <div className="space-y-4 rounded-[2.5rem] border-2 border-dashed border-gray-100 bg-gray-50/50 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-gray-300 shadow-lg">
            <Coffee size={32} />
          </div>
          <div>
            <p className="text-lg font-black uppercase tracking-tight text-gray-900">Sem horarios nesta data</p>
            <p className="mx-auto max-w-[240px] text-xs font-medium text-gray-400">
              Nao encontramos vagas para esse profissional neste dia. Tente outra data ou escolha outro especialista.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
