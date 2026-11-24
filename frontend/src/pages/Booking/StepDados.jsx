import React from 'react';

export default function StepDados({ booking, set, next }) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6B5761]">
            Seu Nome
          </label>
          <input
            type="text"
            value={booking.clienteNome}
            onChange={(e) => set('clienteNome', e.target.value)}
            placeholder="Como podemos te chamar?"
            required
            className="w-full rounded-2xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3.5 text-sm font-medium text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white focus:ring-2 focus:ring-[#B84C6B]/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6B5761]">
            WhatsApp
          </label>
          <input
            type="tel"
            value={booking.clienteTelefone}
            onChange={(e) => set('clienteTelefone', formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            required
            className="w-full rounded-2xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3.5 text-sm font-medium text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white focus:ring-2 focus:ring-[#B84C6B]/15"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#6B5761]">
            Observações <span className="font-normal normal-case tracking-normal text-[#9E8792]">(opcional)</span>
          </label>
          <textarea
            value={booking.observacao}
            onChange={(e) => set('observacao', e.target.value)}
            placeholder="Algum detalhe importante para o atendimento?"
            rows={3}
            className="w-full resize-none rounded-2xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3.5 text-sm font-medium text-[#23141C] outline-none transition placeholder:text-[#9E8792] focus:border-[#B84C6B] focus:bg-white focus:ring-2 focus:ring-[#B84C6B]/15"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-[#B84C6B] py-4 text-sm font-bold text-white transition hover:bg-[#9E3E5A] disabled:opacity-50"
      >
        Revisar Agendamento
      </button>
    </form>
  );
}
