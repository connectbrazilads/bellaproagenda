import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Scissors, Star, Heart, Zap } from 'lucide-react';
import { getServicosPublicos, getPacotesPublicos } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepServico({ booking, set, next, cor }) {
  const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState('servicos');

  useEffect(() => {
    Promise.all([getServicosPublicos(booking.slug), getPacotesPublicos(booking.slug)])
      .then(([servicosResponse, pacotesResponse]) => {
        setServicosDisponiveis(servicosResponse.data || []);
        setPacotes(pacotesResponse.data || []);
      })
      .finally(() => setLoading(false));
  }, [booking.slug]);

  function toggleServico(servico) {
    const isNovoPacote = aba === 'pacotes';
    const idsSelecionados = booking.servicos.map((item) => item.id);
    const temTipoDiferente = booking.servicos.some((item) => item.isPacote !== isNovoPacote);
    let novosServicos;

    if (temTipoDiferente) {
      novosServicos = [{ ...servico, isPacote: isNovoPacote }];
    } else if (idsSelecionados.includes(servico.id)) {
      novosServicos = booking.servicos.filter((item) => item.id !== servico.id);
    } else if (isNovoPacote) {
      novosServicos = [{ ...servico, isPacote: true }];
    } else {
      novosServicos = [...booking.servicos, { ...servico, isPacote: false }];
    }

    set('servicos', novosServicos);
    set('profissional', null);
    set('data', '');
    set('hora', '');
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-28 w-full rounded-3xl bg-white/5 border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const total = booking.servicos.reduce((acc, item) => acc + Number(item.preco || 0), 0);
  const listaAtual = aba === 'servicos' ? servicosDisponiveis : pacotes;

  return (
    <div className="space-y-8">
      {pacotes.length > 0 && (
        <div className="flex rounded-[2rem] border border-[#d4af37]/20 bg-black/40 p-1.5 backdrop-blur-md">
          <button
            onClick={() => setAba('servicos')}
            className={cn(
              'flex-1 rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
              aba === 'servicos' ? 'bg-[#d4af37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'text-[#b299a0] hover:text-[#d4af37]'
            )}
          >
            Serviços
          </button>
          <button
            onClick={() => setAba('pacotes')}
            className={cn(
              'flex-1 rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
              aba === 'pacotes' ? 'bg-[#d4af37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'text-[#b299a0] hover:text-[#d4af37]'
            )}
          >
            Pacotes VIP
          </button>
        </div>
      )}

      <div className="custom-scrollbar max-h-[450px] space-y-4 overflow-y-auto px-1 pb-4">
        {listaAtual.map((item, idx) => {
          const selected = booking.servicos.some((servico) => servico.id === item.id);
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
                'group relative w-full overflow-hidden rounded-[2rem] border p-6 text-left transition-all',
                selected ? 'bg-[#d4af37]/10 border-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.15)]' : 'border-white/10 bg-black/40 hover:border-[#d4af37]/40 hover:bg-black/60'
              )}
            >
              {selected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-0 top-0 p-3">
                  <div className="rounded-full bg-[#d4af37] p-1.5 text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                    <Check className="h-4 w-4" strokeWidth={4} />
                  </div>
                </motion.div>
              )}

              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-1 items-center gap-6">
                  <div
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors duration-500',
                      selected ? 'bg-[#d4af37]/20 border-[#d4af37]/30' : 'bg-white/5 border-white/10 group-hover:border-[#d4af37]/30'
                    )}
                  >
                    {item.nome.toLowerCase().includes('corte') ? (
                      <Scissors className="h-7 w-7 text-[#d4af37]" />
                    ) : item.nome.toLowerCase().includes('unha') ? (
                      <Heart className="h-7 w-7 text-[#d4af37]" />
                    ) : item.nome.toLowerCase().includes('ia') ? (
                      <Zap className="h-7 w-7 text-[#d4af37]" />
                    ) : (
                      <Star className="h-7 w-7 text-[#d4af37]" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="mb-0.5 text-lg font-brand-display font-black tracking-tight text-[#f4ecd8] group-hover:text-[#d4af37] transition-colors">{item.nome}</h3>
                    <p className="max-w-[200px] text-[11px] font-light leading-relaxed text-[#b299a0]">
                      {item.descricao || 'Experiência premium de beleza e bem-estar.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-brand-display font-black tracking-tighter text-[#d4af37]">
                    R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a6c74]">
                    <Clock className="h-3 w-3" />
                    {item.duracaoMin} min
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {booking.servicos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-t border-white/10 pt-8"
        >
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Investimento Total</p>
            <p className="text-3xl font-brand-display font-black tracking-tighter text-[#f4ecd8]">R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <button
            onClick={next}
            className="premium-btn-primary rounded-full px-12 py-5 text-sm font-black uppercase tracking-[0.2em]"
          >
            Continuar
          </button>
        </motion.div>
      )}
    </div>
  );
}
