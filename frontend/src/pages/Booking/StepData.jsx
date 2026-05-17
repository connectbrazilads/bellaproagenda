import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function StepData({ booking, set, next, back, cor }) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [mais, setMes] = useState(hoje.getMonth());
  const [ano, salao] = useState(hoje.getFullYear());

  const primeiroDia = new Date(ano, mais, 1).getDay();
  const diasNoMes = new Date(ano, mais + 1, 0).getDate();

  function formatarData(d) {
    return `${ano}-${String(mais + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function isPast(d) {
    const dt = new Date(ano, mais, d);
    return dt < hoje;
  }

  function selecionar(d) {
    if (isPast(d)) return;
    set('data', formatarData(d));
    set('hora', '');
    next();
  }

  function mesAnterior() {
    if (mais === 0) { setMes(11); salao(ano - 1); }
    else setMes(mais - 1);
  }

  function proximoMes() {
    if (mais === 11) { setMes(0); salao(ano + 1); }
    else setMes(mais + 1);
  }

  const dataAtual = booking.data
    ? new Date(booking.data + 'T00:00:00')
    : null;

  return (
    <div className="space-y-8 pb-6">
       <div className="bg-gray-50/50 rounded-3xl p-5 flex items-center gap-5 border border-gray-100/50 backdrop-blur-sm">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-xl border border-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
            {booking.profissional.fotoUrl ? (
              <img src={booking.profissional.fotoUrl} alt={booking.profissional.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                <User size={24} />
              </div>
            )}
          </div>
          <div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Agendando com</p>
             <p className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none">{booking.profissional.nome}</p>
          </div>
       </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/20 overflow-hidden">
        <div className="bg-gray-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex items-center justify-between relative z-10">
            <button 
              onClick={mesAnterior} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
            >
               <ChevronLeft size={20} strokeWidth={3} />
            </button>
            
            <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">{ano}</p>
              <h3 className="text-xl font-black uppercase tracking-widest">{MESES[mais]}</h3>
            </div>

            <button 
              onClick={proximoMes} 
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
            >
               <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-7 gap-2 mb-6">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] text-gray-300 font-black uppercase tracking-widest">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const d = i + 1;
              const past = isPast(d);
              const dataStr = formatarData(d);
              const selecionado = dataAtual
                && dataAtual.getDate() === d
                && dataAtual.getMonth() === mais
                && dataAtual.getFullYear() === ano;

              return (
                <motion.button
                  key={d}
                  whileHover={!past ? { scale: 1.1, y: -2 } : {}}
                  whileTap={!past ? { scale: 0.95 } : {}}
                  onClick={() => selecionar(d)}
                  disabled={past}
                  className={cn(
                    "aspect-square rounded-2xl text-sm font-black transition-all flex flex-col items-center justify-center relative",
                    selecionado ? "shadow-2xl z-10" : "hover:bg-gray-50"
                  )}
                  style={{
                    backgroundColor: selecionado ? cor : 'transparent',
                    boxShadow: selecionado ? `0 15px 30px -10px ${cor}88` : 'none',
                    color: selecionado ? 'white' : past ? '#f3f4f6' : '#1f2937',
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
                  {!past && !selecionado && (
                    <div className="w-1 h-1 rounded-full bg-gray-200 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-[10px] font-black text-gray-300 uppercase tracking-widest">
         <CalendarIcon size={12} /> Selecione o melhor dia para você
      </div>
    </div>
  );
}
