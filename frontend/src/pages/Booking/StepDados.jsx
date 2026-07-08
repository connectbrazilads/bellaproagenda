import React from 'react';

export default function StepDados({ booking, set, next, back, cor }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!booking.clienteNome.trim()) return;
    
    const telClean = booking.clienteTelefone.replace(/\D/g, '');
    if (telClean.length < 10) {
      alert('Por favor, insira um número de WhatsApp completo com DDD.');
      return;
    }
    
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
          <label className="absolute -top-2.5 left-5 bg-[#120e11] px-2 text-[9px] font-black text-[#b299a0] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[#d4af37] z-10 rounded-md">Seu Nome</label>
          <input
            type="text"
            value={booking.clienteNome}
            onChange={(e) => set('clienteNome', e.target.value)}
            placeholder="Como podemos te chamar?"
            required
            className="w-full bg-black/40 border border-[#d4af37]/20 focus:border-[#d4af37] focus:bg-[#d4af37]/5 rounded-[2rem] px-8 py-5 text-sm font-brand-display font-black text-[#f4ecd8] outline-none transition-all placeholder:text-[#8a6c74] placeholder:font-sans placeholder:font-light"
          />
        </div>

        <div className="relative group">
          <label className="absolute -top-2.5 left-5 bg-[#120e11] px-2 text-[9px] font-black text-[#b299a0] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[#d4af37] z-10 rounded-md">WhatsApp</label>
          <input
            type="tel"
            value={booking.clienteTelefone}
            onChange={(e) => set('clienteTelefone', formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            required
            className="w-full bg-black/40 border border-[#d4af37]/20 focus:border-[#d4af37] focus:bg-[#d4af37]/5 rounded-[2rem] px-8 py-5 text-sm font-brand-display font-black text-[#f4ecd8] outline-none transition-all placeholder:text-[#8a6c74] placeholder:font-sans placeholder:font-light"
          />
        </div>

        <div className="relative group">
          <label className="absolute -top-2.5 left-5 bg-[#120e11] px-2 text-[9px] font-black text-[#b299a0] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[#d4af37] z-10 rounded-md">Observações (Opcional)</label>
          <textarea
            value={booking.observacao}
            onChange={(e) => set('observacao', e.target.value)}
            placeholder="Algum detalhe importante para o atendimento?"
            rows={3}
            className="w-full bg-black/40 border border-[#d4af37]/20 focus:border-[#d4af37] focus:bg-[#d4af37]/5 rounded-[2.5rem] px-8 py-6 text-sm font-brand-display font-black text-[#f4ecd8] outline-none transition-all placeholder:text-[#8a6c74] placeholder:font-sans placeholder:font-light resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="premium-btn-primary w-full text-sm disabled:opacity-50"
      >
        Revisar Agendamento
      </button>
    </form>
  );
}
