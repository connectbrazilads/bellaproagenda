import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sun, Sunrise, Coffee, Moon } from 'lucide-react';
import { getHorariosDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepHorario({ booking, set, next, cor }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isPacote = booking.servicos[0]?.isPacote;
    const params = {
      profissionalId: booking.profissional.id,
      data: booking.data,
      ...(isPacote ? { pacoteId: booking.servicos[0].id } : { servicoIds: booking.servicos.map((item) => item.id) }),
    };

    setLoading(true);
    getHorariosDisponiveis(booking.slug, params)
      .then((response) => setSlots(response.data || []))
      .finally(() => setLoading(false));
  }, [booking.slug, booking.profissional.id, booking.servicos, booking.data]);

  function selecionar(hora) {
    set('hora', hora);
    next();
  }

  const periods = {
    manha: slots.filter((slot) => parseInt(slot.split(':')[0], 10) < 12),
    tarde: slots.filter((slot) => parseInt(slot.split(':')[0], 10) >= 12 && parseInt(slot.split(':')[0], 10) < 18),
    noite: slots.filter((slot) => parseInt(slot.split(':')[0], 10) >= 18),
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-100 border-t-purple-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Consultando agenda</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 rounded-[2rem] border border-gray-100/50 bg-gray-50/50 p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-purple-600 shadow-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Data Escolhida</p>
            <p className="text-sm font-black uppercase tracking-tight text-gray-900">
              {new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
            </p>
          </div>
        </div>
      </div>

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
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  name === 'manha' ? 'bg-amber-50 text-amber-500' : name === 'tarde' ? 'bg-orange-50 text-orange-500' : 'bg-indigo-50 text-indigo-500'
                )}
              >
                {name === 'manha' ? <Sunrise size={16} /> : name === 'tarde' ? <Sun size={16} /> : <Moon size={16} />}
              </div>
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

      {slots.length === 0 && (
        <div className="space-y-4 rounded-[2.5rem] border-2 border-dashed border-gray-100 bg-gray-50/50 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-gray-300 shadow-lg">
            <Coffee size={32} />
          </div>
          <div>
            <p className="text-lg font-black uppercase tracking-tight text-gray-900">Sem horarios para hoje</p>
            <p className="mx-auto max-w-[200px] text-xs font-medium text-gray-400">Nao encontramos vagas nesta data. Tente outro dia ou especialista.</p>
          </div>
        </div>
      )}
    </div>
  );
}
