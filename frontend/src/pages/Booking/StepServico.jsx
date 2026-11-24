import React, { useEffect, useState } from 'react';
import { Check, Clock, Scissors, Star, Heart, Zap } from 'lucide-react';
import { getServicosPublicos, getPacotesPublicos } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepServico({ booking, set, next }) {
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
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-24 w-full animate-pulse rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5]" />
        ))}
      </div>
    );
  }

  const total = booking.servicos.reduce((acc, item) => acc + Number(item.preco || 0), 0);
  const listaAtual = aba === 'servicos' ? servicosDisponiveis : pacotes;

  return (
    <div className="space-y-6">
      {pacotes.length > 0 && (
        <div className="grid grid-cols-2 rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-1">
          <button
            type="button"
            onClick={() => setAba('servicos')}
            className={cn(
              'rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition',
              aba === 'servicos'
                ? 'bg-[#23141C] text-white shadow-sm'
                : 'text-[#6B5761] hover:text-[#23141C]'
            )}
          >
            Serviços
          </button>
          <button
            type="button"
            onClick={() => setAba('pacotes')}
            className={cn(
              'rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition',
              aba === 'pacotes'
                ? 'bg-[#23141C] text-white shadow-sm'
                : 'text-[#6B5761] hover:text-[#23141C]'
            )}
          >
            Pacotes VIP
          </button>
        </div>
      )}

      <div className="custom-scrollbar max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {listaAtual.map((item) => {
          const selected = booking.servicos.some((servico) => servico.id === item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleServico(item)}
              className={cn(
                'group relative w-full rounded-2xl border p-4 text-left transition sm:p-5',
                selected
                  ? 'border-[#B84C6B] bg-[#FDF7F9] ring-1 ring-[#B84C6B]/20'
                  : 'border-[#EAE1E4] bg-white hover:border-[#D9C6CE] hover:bg-[#FCFAFB]'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition',
                      selected
                        ? 'border-[#B84C6B]/30 bg-[#B84C6B] text-white'
                        : 'border-[#EAE1E4] bg-[#FAF7F5] text-[#B84C6B]'
                    )}
                  >
                    {selected ? (
                      <Check className="h-5 w-5" strokeWidth={2.8} />
                    ) : item.nome.toLowerCase().includes('corte') ? (
                      <Scissors className="h-5 w-5" />
                    ) : item.nome.toLowerCase().includes('unha') ? (
                      <Heart className="h-5 w-5" />
                    ) : item.nome.toLowerCase().includes('ia') ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <Star className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-[#23141C]">{item.nome}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#6B5761]">
                      {item.descricao || 'Atendimento personalizado de beleza e bem-estar.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-[#23141C]">
                    R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-medium text-[#8E7682]">
                    <Clock className="h-3 w-3" />
                    {item.duracaoMin} min
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {booking.servicos.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-[#EAE1E4] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E7682]">
              Total ({booking.servicos.length} {booking.servicos.length === 1 ? 'item' : 'itens'})
            </p>
            <p className="text-2xl font-bold text-[#23141C]">R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <button
            type="button"
            onClick={next}
            className="w-full rounded-2xl bg-[#B84C6B] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#9E3E5A] sm:w-auto"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
