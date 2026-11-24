import React, { useMemo, useState } from 'react';
import { criarAgendamentoPublico, criarAgendamentoPublicoMultiplo } from '../../services/api';

export default function StepConfirmacao({ booking, back, onSuccess }) {
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
    <div className="space-y-6">
      <div className="space-y-5 rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-5 sm:p-6">
        {booking.multiProfissional && (
          <div className="rounded-xl border border-[#F0D5DE] bg-[#FDF7F9] px-4 py-3 text-xs leading-relaxed text-[#6B5761]">
            Cada serviço será executado pelo especialista escolhido, tudo centralizado na mesma comanda.
          </div>
        )}

        <div className="border-b border-[#EAE1E4] pb-4">
          <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8E7682]">
            Serviços Selecionados
          </span>
          <div className="space-y-2.5">
            {(booking.multiProfissional ? booking.multiItens : booking.servicos).map((item) => (
              <div key={item.servicoId || item.id} className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-[#23141C]">{item.servicoNome || item.nome}</span>
                  {booking.multiProfissional && (
                    <p className="mt-0.5 text-xs text-[#6B5761]">
                      {item.profissionalNome} · <span className="font-bold text-[#B84C6B]">{item.hora}</span>
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-[#23141C]">
                  R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#D9C6CE] pt-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B5761]">Total estimado</span>
              <span className="text-xl font-bold text-[#B84C6B]">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#EAE1E4] pb-3">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8E7682]">Data</span>
          <span className="text-right text-sm font-bold capitalize text-[#23141C]">{dataFormatada}</span>
        </div>

        {!booking.multiProfissional && (
          <div className="flex items-center justify-between border-b border-[#EAE1E4] pb-3">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8E7682]">Profissional</span>
            <span className="text-sm font-bold text-[#23141C]">{booking.profissional.nome}</span>
          </div>
        )}

        {!booking.multiProfissional && (
          <div className="flex items-center justify-between border-b border-[#EAE1E4] pb-3">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8E7682]">Horário</span>
            <span className="text-sm font-bold text-[#B84C6B]">{booking.hora}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8E7682]">Cliente</span>
          <span className="text-right text-sm font-semibold text-[#23141C]">
            {booking.clienteNome} · {booking.clienteTelefone}
          </span>
        </div>
      </div>

      {erro && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-semibold text-rose-700">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={back}
          type="button"
          disabled={loading}
          className="w-full rounded-2xl border border-[#E2D5DA] bg-white py-3.5 text-sm font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B] disabled:cursor-not-allowed disabled:opacity-50 sm:w-1/3"
        >
          Voltar
        </button>
        <button
          onClick={finalizar}
          type="button"
          disabled={loading}
          className="w-full rounded-2xl bg-[#23141C] py-3.5 text-sm font-bold text-white transition hover:bg-[#3A222E] disabled:opacity-50 sm:w-2/3"
        >
          {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
}
