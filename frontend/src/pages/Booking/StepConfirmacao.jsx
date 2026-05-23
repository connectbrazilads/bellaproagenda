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
      <div className="space-y-4 rounded-3xl bg-gray-50 p-6">
        {booking.multiProfissional && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] font-bold leading-relaxed text-amber-800">
            Cada servico sera executado pelo profissional escolhido e tudo ficara na mesma comanda para o checkout final.
          </div>
        )}

        <div className="border-b border-gray-200 pb-3">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Servicos</span>
          <div className="space-y-2">
            {(booking.multiProfissional ? booking.multiItens : booking.servicos).map((item) => (
              <div key={item.servicoId || item.id} className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm font-black text-gray-900">{item.servicoNome || item.nome}</span>
                  {booking.multiProfissional && (
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                      {item.profissionalNome} · {item.hora}
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-400">R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-200 pt-2">
              <span className="text-xs font-black uppercase text-gray-900">Total</span>
              <span className="text-sm font-black text-purple-600">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between border-b border-gray-200 pb-3">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">Data</span>
          <span className="text-right text-sm font-black text-gray-900">{dataFormatada}</span>
        </div>

        {!booking.multiProfissional && (
          <div className="flex justify-between border-b border-gray-200 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Profissional</span>
            <span className="text-sm font-black text-gray-900">{booking.profissional.nome}</span>
          </div>
        )}

        {!booking.multiProfissional && (
          <div className="flex justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Horario</span>
            <span className="text-sm font-black text-gray-900">{booking.hora}</span>
          </div>
        )}
      </div>

      {erro && <p className="text-center text-xs font-bold text-red-500">{erro}</p>}

      <div className="flex gap-3">
        <button
          onClick={back}
          type="button"
          className="w-full rounded-2xl bg-gray-100 py-5 text-lg font-black text-gray-500 transition-all hover:bg-gray-200"
        >
          Voltar
        </button>
        <button
          onClick={finalizar}
          disabled={loading}
          style={{ backgroundColor: cor }}
          className="w-full rounded-2xl py-5 text-lg font-black text-white shadow-xl shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
        >
          {loading ? 'PROCESSANDO...' : 'CONFIRMAR AGENDAMENTO'}
        </button>
      </div>
    </div>
  );
}
