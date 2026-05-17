import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sun, Sunrise, Sunset, Coffee, Moon } from 'lucide-react';
import { getHorariosDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepHorario({ booking, set, next, cor }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isPacote = booking.serviços[0]?.isPacote;
    const params = {
      profissionalId: booking.profissional.id,
      data: booking.data,
      ...(isPacote ? { pacoteId: booking.serviços[0].id } : { servicoIds: booking.serviços.map(s => s.id) }),
    };

    setLoading(true);
    getHorariosDisponiveis(booking.slug, params)
      .then((r) => setSlots(r.data))
      .finally(() => setLoading(false));
  }, [booking.slug, booking.profissional.id, booking.serviços, booking.data]);

  function selecionar(hora) {
    set('hora', hora);
    next();
  }

  // Agrupar horários por período
  const periods = {
    manhã: slots.filter(s => parseInt(s.split(':')[0]) < 12),
    tarde: slots.filter(s => parseInt(s.split(':')[0]) >= 12 && parseInt(s.split(':')[0]) < 18),
    noite: slots.filter(s => parseInt(s.split(':')[0]) >= 18)
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Consultando agenda</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center text-purple-600">
              <Clock size={24} />
           </div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Data Escolhida</p>
              <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                 {new Date(booking.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', weekday: 'long' })}
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
               <div className={cn(
                 "w-8 h-8 rounded-lg flex items-center justify-center",
                 name === 'manhã' ? "bg-amber-50 text-amber-500" : name === 'tarde' ? "bg-orange-50 text-orange-500" : "bg-indigo-50 text-indigo-500"
               )}>
                  {name === 'manhã' ? <Sunrise size={16} /> : name === 'tarde' ? <Sun size={16} /> : <Moon size={16} />}
               </div>
               <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.4em]">{name}</h4>
               <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {times.map((hora) => (
                <motion.button
                  key={hora}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selecionar(hora)}
                  className={cn(
                    "min-h-16 rounded-2xl border-2 font-black text-sm transition-all flex items-center justify-center shadow-sm",
                    booking.hora === hora ? "bg-white border-purple-500 text-purple-600 shadow-xl shadow-purple-500/10" : "bg-white border-gray-50 text-gray-900 hover:border-purple-500/20"
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
        <div className="rounded-[2.5rem] border-2 border-dashed border-gray-100 bg-gray-50/50 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto text-gray-300">
             <Coffee size={32} />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 uppercase tracking-tight">Sem horários para hoje</p>
            <p className="text-xs text-gray-400 font-medium max-w-[200px] mx-auto">Não encontramos vagas nesta data. Que tal tentar outro dia ou especialista?</p>
          </div>
        </div>
      )}
    </div>
  );
}
