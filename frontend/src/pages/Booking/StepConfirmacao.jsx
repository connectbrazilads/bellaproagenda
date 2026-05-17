import React, { useState } from 'react';
import { criarAgendamentoPublico } from '../../services/api';

export default function StepConfirmacao({ booking, back, cor, salao, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function finalizar() {
    setLoading(true);
    setErro('');
    try {
      const pacote = booking.serviços.find(s => s.isPacote);
      const isPacote = !!pacote;
      const res = await criarAgendamentoPublico(booking.slug, {
        profissionalId: booking.profissional.id,
        ...(isPacote ? { pacoteId: pacote.id } : { servicoIds: booking.serviços.map(s => s.id) }),
        clienteNome: booking.clienteNome,
        clienteTelefone: booking.clienteTelefone,
        data: booking.data,
        hora: booking.hora,
        observacao: booking.observacao,
      });
      onSuccess(res.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao agendar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const total = booking.serviços.reduce((acc, s) => acc + Number(s.preco), 0);

  return (
    <div className="space-y-8">
      <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Serviços</span>
          <div className="space-y-1">
            {booking.serviços.map(s => (
              <div key={s.id} className="flex justify-between items-center">
                <span className="text-sm font-black text-gray-900">{s.nome}</span>
                <span className="text-xs font-bold text-gray-400">R$ {Number(s.preco).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
            {booking.serviços.length > 1 && (
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-gray-200">
                <span className="text-xs font-black text-gray-900 uppercase">Total</span>
                <span className="text-sm font-black text-purple-600">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-3">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Profissional</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-900">{booking.profissional.nome}</span>
            {booking.profissional.fotoUrl && <img src={booking.profissional.fotoUrl} className="w-6 h-6 rounded-full object-cover" />}
          </div>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-3">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Data e Hora</span>
          <span className="text-sm font-black text-gray-900">{booking.data} as {booking.hora}</span>
        </div>
      </div>

      {salao?.fidelidadeAtiva && (
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{salao.fidelidadeTipo === 'cashback' ? '💰' : '💎'}</span>
            <div>
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Você vai ganhar</p>
              <p className="text-sm font-black text-purple-700">
                {salao.fidelidadeTipo === 'cashback' 
                  ? `R$ ${(total * (parseFloat(salao.fidelidadeRegra) || 0) / 100).toFixed(2).replace('.', ',')} de volta`
                  : `${Math.floor(total * (parseFloat(salao.fidelidadeRegra) || 0))} pontos de fidelidade`}
              </p>
            </div>
          </div>
          <div className="bg-white/50 px-2 py-1 rounded-lg text-[9px] font-black text-purple-400 uppercase border border-purple-200">B?nus</div>
        </div>
      )}

      {erro && <p className="text-red-500 text-xs font-bold text-center">{erro}</p>}

      <button
        onClick={finalizar}
        disabled={loading}
        style={{ backgroundColor: cor }}
        className="w-full py-5 rounded-2xl text-white font-black text-lg shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all"
      >
        {loading ? 'PROCESSANDO...' : 'CONFIRMAR AGENDAMENTO'}
      </button>
    </div>
  );
}
