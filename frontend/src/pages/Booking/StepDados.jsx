import React from 'react';

export default function StepDados({ booking, set, next, back, cor }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!booking.clienteNome.trim() || !booking.clienteTelefone.trim()) return;
    next();
  }

  function formatarTelefone(v) {
    const n = v.replace(/\D/g, '').slice(0, 11);
    if (n.length <= 2) return n;
    if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div className="relative group">
          <label className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] font-black text-gray-300 uppercase tracking-widest transition-colors group-focus-within:text-purple-600">Seu Nome</label>
          <input
            type="text"
            value={booking.clienteNome}
            onChange={(e) => set('clienteNome', e.target.value)}
            placeholder="Como podemos te chamar?"
            required
            className="w-full bg-white border-2 border-gray-50 focus:border-purple-600 rounded-3xl px-8 py-5 font-black text-gray-900 outline-none transition-all placeholder:text-gray-200"
          />
        </div>

        <div className="relative group">
          <label className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] font-black text-gray-300 uppercase tracking-widest transition-colors group-focus-within:text-purple-600">WhatsApp</label>
          <input
            type="tel"
            value={booking.clienteTelefone}
            onChange={(e) => set('clienteTelefone', formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            required
            className="w-full bg-white border-2 border-gray-50 focus:border-purple-600 rounded-3xl px-8 py-5 font-black text-gray-900 outline-none transition-all placeholder:text-gray-200"
          />
        </div>

        <div className="relative group">
          <label className="absolute -top-2.5 left-5 bg-white px-2 text-[10px] font-black text-gray-300 uppercase tracking-widest transition-colors group-focus-within:text-purple-600">Observações</label>
          <textarea
            value={booking.observacao}
            onChange={(e) => set('observacao', e.target.value)}
            placeholder="Algum detalhe importante?"
            rows={3}
            className="w-full bg-white border-2 border-gray-50 focus:border-purple-600 rounded-[2rem] px-8 py-5 font-black text-gray-900 outline-none transition-all placeholder:text-gray-200 resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-5 rounded-[1.5rem] text-white font-black text-lg shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
        style={{ backgroundColor: cor }}
      >
        REVISAR AGENDAMENTO
      </button>
    </form>
  );
}
