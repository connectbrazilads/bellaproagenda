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
          <div key={item} className="h-28 w-full animate-shimmer rounded-3xl bg-gray-50" />
        ))}
      </div>
    );
  }

  const total = booking.servicos.reduce((acc, item) => acc + Number(item.preco || 0), 0);
  const listaAtual = aba === 'servicos' ? servicosDisponiveis : pacotes;

  return (
    <div className="space-y-8">
      {pacotes.length > 0 && (
        <div className="flex rounded-[2rem] border border-gray-100 bg-gray-50 p-1.5">
          <button
            onClick={() => setAba('servicos')}
            className={cn(
              'flex-1 rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
              aba === 'servicos' ? 'bg-white text-gray-900 shadow-xl shadow-gray-200/50' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Servicos
          </button>
          <button
            onClick={() => setAba('pacotes')}
            className={cn(
              'flex-1 rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
              aba === 'pacotes' ? 'bg-white text-gray-900 shadow-xl shadow-gray-200/50' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            Pacotes VIP
          </button>
        </div>
      )}

      <div className="custom-scrollbar max-h-[450px] space-y-4 overflow-y-auto px-1">
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
                'group relative w-full overflow-hidden rounded-[2rem] border-2 p-6 text-left transition-all',
                selected ? 'bg-white' : 'border-gray-50 bg-white hover:border-gray-100 hover:bg-gray-50/50'
              )}
              style={{ borderColor: selected ? cor : undefined }}
            >
              {selected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-0 top-0 p-3">
                  <div className="rounded-full p-1.5 text-white shadow-lg" style={{ backgroundColor: cor }}>
                    <Check className="h-4 w-4" strokeWidth={4} />
                  </div>
                </motion.div>
              )}

              <div className="flex items-center justify-between gap-6">
                <div className="flex flex-1 items-center gap-6">
                  <div
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-500',
                      selected ? 'bg-purple-50' : 'bg-gray-50 group-hover:bg-white'
                    )}
                    style={{ backgroundColor: selected ? `${cor}15` : undefined }}
                  >
                    {item.nome.toLowerCase().includes('corte') ? (
                      <Scissors className="h-7 w-7" style={{ color: cor }} />
                    ) : item.nome.toLowerCase().includes('unha') ? (
                      <Heart className="h-7 w-7" style={{ color: cor }} />
                    ) : item.nome.toLowerCase().includes('ia') ? (
                      <Zap className="h-7 w-7" style={{ color: cor }} />
                    ) : (
                      <Star className="h-7 w-7" style={{ color: cor }} />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="mb-0.5 text-lg font-black uppercase tracking-tight text-gray-900">{item.nome}</h3>
                    <p className="max-w-[200px] text-xs font-medium leading-relaxed text-gray-400">
                      {item.descricao || 'Experiencia premium de beleza personalizada.'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black tracking-tighter" style={{ color: cor }}>
                    R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-black uppercase text-gray-300">
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
          className="flex items-center justify-between border-t border-gray-100 pt-8"
        >
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Investimento Total</p>
            <p className="text-3xl font-black tracking-tighter text-gray-900">R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <button
            onClick={next}
            style={{
              backgroundColor: cor,
              boxShadow: `0 20px 40px -10px ${cor}44`,
            }}
            className="rounded-[1.5rem] px-12 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:scale-105 active:scale-95"
          >
            Continuar
          </button>
        </motion.div>
      )}
    </div>
  );
}
