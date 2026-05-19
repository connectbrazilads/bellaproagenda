import React, { useState } from 'react';
import { criarAgendamentoPublico } from '../../services/api';

export default function StepConfirmacao({ booking, back, cor, salao, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function finalizar() {
    setLoading(true);
    setErro('');

    try {
      const pacote = booking.servicos.find((item) => item.isPacote);
      const isPacote = !!pacote;
      const response = await criarAgendamentoPublico(booking.slug, {
        profissionalId: booking.profissional.id,
        ...(isPacote ? { pacoteId: pacote.id } : { servicoIds: booking.servicos.map((item) => item.id) }),
        clienteNome: booking.clienteNome,
        clienteTelefone: booking.clienteTelefone,
        data: booking.data,
        hora: booking.hora,
        observacao: booking.observacao,
      });

      onSuccess(response.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao agendar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const total = booking.servicos.reduce((acc, item) => acc + Number(item.preco || 0), 0);

  return (
    <div className="space-y-8">
      <div className="space-y-4 rounded-3xl bg-gray-50 p-6">
        <div className="border-b border-gray-200 pb-3">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Servicos</span>
          <div className="space-y-1">
            {booking.servicos.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm font-black text-gray-900">{item.nome}</span>
                <span className="text-xs font-bold text-gray-400">R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            {booking.servicos.length > 1 && (
              <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-200 pt-2">
                <span className="text-xs font-black uppercase text-gray-900">Total</span>
                <span className="text-sm font-black text-purple-600">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-3">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">Profissional</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-900">{booking.profissional.nome}</span>
            {booking.profissional.fotoUrl && (
              <img src={booking.profissional.fotoUrl} className="h-6 w-6 rounded-full object-cover" alt={booking.profissional.nome} />
            )}
          </div>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-3">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400">Data e Hora</span>
          <span className="text-sm font-black text-gray-900">{booking.data} as {booking.hora}</span>
        </div>
      </div>

      {salao?.fidelidadeAtiva && (
        <div className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{salao.fidelidadeTipo === 'cashback' ? '💰' : '💎'}</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Voce vai ganhar</p>
              <p className="text-sm font-black text-purple-700">
                {salao.fidelidadeTipo === 'cashback'
                  ? `R$ ${(total * (parseFloat(salao.fidelidadeRegra) || 0) / 100).toFixed(2).replace('.', ',')} de volta`
                  : `${Math.floor(total * (parseFloat(salao.fidelidadeRegra) || 0))} pontos de fidelidade`}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-white/50 px-2 py-1 text-[9px] font-black uppercase text-purple-400">Bonus</div>
        </div>
      )}

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
