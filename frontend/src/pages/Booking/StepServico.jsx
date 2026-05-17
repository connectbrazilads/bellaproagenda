import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Scissors, Star, Heart, Zap } from 'lucide-react';
import { getServicosPublicos, getPacotesPublicos } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepServico({ booking, set, next, cor }) {
  const [serviços, setServicos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('serviços');

  useEffect(() => {
    Promise.all([getServicosPublicos(booking.slug), getPacotesPublicos(booking.slug)])
      .then(([rs, rp]) => { setServicos(rs.data); setPacotes(rp.data); })
      .finally(() => setLoading(false));
  }, [booking.slug]);

  function toggleServico(serviço) {
    const isNovoPacote = aba === 'pacotes';
    const ids = booking.serviços.map(s => s.id);
    let newServicos;

    // Se mudar o tipo (de serviço pra pacote ou vice-versa), limpa tudo antes
    const temTipoDiferente = booking.serviços.some(s => s.isPacote !== isNovoPacote);
    
    if (temTipoDiferente) {
      newServicos = [{ ...serviço, isPacote: isNovoPacote }];
    } else {
      if (ids.includes(serviço.id)) {
        newServicos = booking.serviços.filter(s => s.id !== serviço.id);
      } else {
        // Se for pacote, geralmente é apenas um por vez? 
        // Vamos permitir múltiplos se forem do mesmo tipo, mais se for pacote, talvez seja melhor limitar a 1
        if (isNovoPacote) {
           newServicos = [{ ...serviço, isPacote: true }];
        } else {
           newServicos = [...booking.serviços, { ...serviço, isPacote: false }];
        }
      }
    }

    set('serviços', newServicos);
    set('profissional', null);
    set('data', '');
    set('hora', '');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 w-full bg-gray-50 rounded-3xl animate-shimmer" />
        ))}
      </div>
    );
  }

  const total = booking.serviços.reduce((acc, s) => acc + Number(s.preco), 0);

  return (
    <div className="space-y-8">
      {pacotes.length > 0 && (
        <div className="flex p-1.5 bg-gray-50 rounded-[2rem] border border-gray-100">
          <button
            onClick={() => setAba('serviços')}
            className={cn(
              "flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              aba === 'serviços' ? 'bg-white shadow-xl shadow-gray-200/50 text-gray-900' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Serviços
          </button>
          <button
            onClick={() => setAba('pacotes')}
            className={cn(
              "flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              aba === 'pacotes' ? 'bg-white shadow-xl shadow-gray-200/50 text-gray-900' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Pacotes VIP
          </button>
        </div>
      )}

      <div className="space-y-4 max-h-[450px] overflow-y-auto px-1 custom-scrollbar">
        {(aba === 'serviços' ? serviços : pacotes).map((item, idx) => {
          const selected = booking.serviços.some(s => s.id === item.id);
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleServico(item)}
              className={cn(
                "group w-full text-left p-6 rounded-[2rem] border-2 transition-all relative overflow-hidden",
                selected ? "bg-white" : "bg-white border-gray-50 hover:border-gray-100 hover:bg-gray-50/50"
              )}
              style={{ borderColor: selected ? cor : undefined }}
            >
              {selected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 p-3"
                >
                  <div className="text-white rounded-full p-1.5 shadow-lg" style={{ backgroundColor: cor }}>
                    <Check className="w-4 h-4" strokeWidth={4} />
                  </div>
                </motion.div>
              )}
              
              <div className="flex justify-between items-center gap-6">
                <div className="flex items-center gap-6 flex-1">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-500",
                    selected ? "bg-purple-50" : "bg-gray-50 group-hover:bg-white"
                  )}
                  style={{ backgroundColor: selected ? `${cor}15` : undefined }}
                  >
                    {item.nome.toLowerCase().includes('corte') ? <Scissors className="w-7 h-7" style={{ color: cor }} /> : 
                     item.nome.toLowerCase().includes('unha') ? <Heart className="w-7 h-7" style={{ color: cor }} /> :
                     item.nome.toLowerCase().includes('ia') ? <Zap className="w-7 h-7" style={{ color: cor }} /> :
                     <Star className="w-7 h-7" style={{ color: cor }} />}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg mb-0.5">
                      {item.nome}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[200px]">
                      {item.descricao || 'Experiência premium de beleza personalizada.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black tracking-tighter" style={{ color: cor }}>
                    R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 text-[10px] font-black text-gray-300 uppercase mt-1">
                    <Clock className="w-3 h-3" />
                    {item.duracaoMin} min
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {booking.serviços.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8 border-t border-gray-100 flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Investimento Total</p>
            <p className="text-3xl font-black text-gray-900 tracking-tighter">R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <button 
            onClick={next}
            style={{ 
              backgroundColor: cor,
              boxShadow: `0 20px 40px -10px ${cor}44`
            }}
            className="px-12 py-5 rounded-[1.5rem] text-white font-black text-sm uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all"
          >
            Continuar
          </button>
        </motion.div>
      )}
    </div>
  );
}
