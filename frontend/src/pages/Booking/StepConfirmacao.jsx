import React, { useMemo, useState } from 'react';
import { criarAgendamentoPublico, criarAgendamentoPublicoMultiplo } from '../../services/api';

export default function StepConfirmacao({ booking, back, cor, salao, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const dataFormatada = booking.data
    ? new Date(`${booking.data}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        weekday: 'long',
      })
    : '-';

  const total = useMemo(() => {
    if (booking.multiProfissional) {
      return (booking.multiItens || []).reduce((acc, item) => acc + Number(item.preco || 0), 0);
    }
    return booking.servicos.reduce((acc, item) => acc + Number(item.preco || 0), 0);
  }, [booking]);

  async function finalizar() {
    setLoading(true);
    setErro('');

    try {
      let response;

      if (booking.multiProfissional) {
        response = await criarAgendamentoPublicoMultiplo(booking.slug, {
          clienteNome: booking.clienteNome,
          clienteTelefone: booking.clienteTelefone,
          data: booking.data,
          observacao: booking.observacao,
          itens: (booking.multiItens || []).map((item) => ({
            servicoId: item.servicoId,
            profissionalId: item.profissionalId,
            hora: item.hora,
          })),
        });
      } else {
        const pacote = booking.servicos.find((item) => item.isPacote);
        const isPacote = !!pacote;
        response = await criarAgendamentoPublico(booking.slug, {
          profissionalId: booking.profissional.id,
          ...(isPacote ? { pacoteId: pacote.id } : { servicoIds: booking.servicos.map((item) => item.id) }),
          clienteNome: booking.clienteNome,
          clienteTelefone: booking.clienteTelefone,
          data: booking.data,
          hora: booking.hora,
          observacao: booking.observacao,
        });
      }

      onSuccess(response.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao agendar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="glass-card-neon space-y-6 rounded-[2.5rem] p-8">
        {booking.multiProfissional && (
          <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-4 text-[11px] font-light leading-relaxed text-[#f4ecd8] backdrop-blur-sm">
            Cada serviço será executado pelo especialista escolhido. Tudo ficará centralizado na mesma comanda para sua conveniência.
          </div>
        )}

        <div className="border-b border-[#d4af37]/20 pb-4">
          <span className="mb-3 block text-[9px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Serviços Selecionados</span>
          <div className="space-y-3">
            {(booking.multiProfissional ? booking.multiItens : booking.servicos).map((item) => (
              <div key={item.servicoId || item.id} className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-brand-display font-black text-[#f4ecd8] uppercase tracking-tight">{item.servicoNome || item.nome}</span>
                  {booking.multiProfissional && (
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#b299a0]">
                      {item.profissionalNome} · <span className="text-[#d4af37]">{item.hora}</span>
                    </p>
                  )}
                </div>
                <span className="text-sm font-brand-display font-black text-[#d4af37]">R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-between border-t border-dashed border-white/10 pt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#b299a0]">Investimento</span>
              <span className="text-xl font-brand-display font-black text-[#d4af37]">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between border-b border-[#d4af37]/20 pb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Data</span>
          <span className="text-right text-xs font-brand-display font-black uppercase tracking-widest text-[#f4ecd8]">{dataFormatada}</span>
        </div>

        {!booking.multiProfissional && (
          <div className="flex justify-between border-b border-[#d4af37]/20 pb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Profissional</span>
            <span className="text-xs font-brand-display font-black uppercase tracking-widest text-[#f4ecd8]">{booking.profissional.nome}</span>
          </div>
        )}

        {!booking.multiProfissional && (
          <div className="flex justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Horário</span>
            <span className="text-xs font-brand-display font-black uppercase tracking-widest text-[#d4af37]">{booking.hora}</span>
          </div>
        )}
      </div>

      {erro && <p className="text-center text-[11px] font-black uppercase tracking-[0.1em] text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">{erro}</p>}

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          onClick={back}
          type="button"
          className="premium-btn-secondary w-full sm:w-1/3 text-sm py-5"
        >
          Voltar
        </button>
        <button
          onClick={finalizar}
          disabled={loading}
          className="premium-btn-primary w-full sm:w-2/3 text-sm py-5 disabled:opacity-50 disabled:filter-grayscale"
        >
          {loading ? 'Processando...' : 'Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}
