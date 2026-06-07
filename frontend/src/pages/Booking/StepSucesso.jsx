import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar, User, Phone, Share2, Heart } from 'lucide-react';

export default function StepSucesso({ agendamento, salao, cor }) {
  const listaAgendamentos = useMemo(() => agendamento?.agendamentos || [], [agendamento]);
  const agendamentoBase = listaAgendamentos[0] || agendamento;
  const dataBruta = agendamentoBase?.data;
  const dataIso = typeof dataBruta === 'string' ? dataBruta.split('T')[0] : '';
  const [ano, mes, dia] = dataIso ? dataIso.split('-') : [];
  const dataFormatada = dia && mes && ano ? `${dia}/${mes}/${ano}` : '--/--/----';

  const nomeServico = listaAgendamentos.length
    ? listaAgendamentos.map((item) => item?.servico?.nome || item?.pacote?.nome || 'Serviço').join(' + ')
    : (agendamentoBase?.servico?.nome || agendamentoBase?.pacote?.nome || agendamentoBase?.itens?.map((item) => item.nome).join(' + ') || '-');

  const nomeProfissional = listaAgendamentos.length
    ? 'Equipe do salão'
    : (agendamentoBase?.profissional?.nome || '-');

  const horarioResumo = listaAgendamentos.length
    ? listaAgendamentos.map((item) => `${item?.servico?.nome || 'Serviço'} ${item?.inicioHora || '-'}`).join(' | ')
    : (agendamentoBase?.inicioHora || agendamentoBase?.hora || '-');

  const itensResumo = listaAgendamentos.length
    ? listaAgendamentos.map((item) => ({
        id: item.id,
        titulo: item?.servico?.nome || item?.pacote?.nome || 'Serviço',
        profissional: item?.profissional?.nome || 'Equipe',
        hora: item?.inicioHora || '-',
      }))
    : [];

  return (
    <div className="flex items-center justify-center overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full text-center relative overflow-hidden"
      >
        <div className="relative z-10 py-10">
          <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#d4af37] to-[#e4c96b] text-black mx-auto mb-10 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
            <Check size={44} strokeWidth={3} />
          </div>

          <h1 className="text-4xl md:text-5xl font-brand-display font-black text-[#f4ecd8] mb-4 tracking-tighter uppercase leading-none">Tudo Pronto!</h1>
          <p className="text-[#b299a0] text-sm mb-12 max-w-xs mx-auto">
            Sua reserva foi criada com sucesso. Preparamos tudo para te receber de forma exclusiva!
          </p>

          <div className="glass-card-neon rounded-[2.5rem] p-8 text-left space-y-6 mb-10 border border-[#d4af37]/20">
            <div className="flex items-start gap-5">
              <div className="p-3 rounded-2xl bg-[#d4af37]/10 text-[#d4af37]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-[#8a6c74] uppercase tracking-widest mb-1">Data e horário</p>
                <p className="text-lg font-brand-display font-black text-[#f4ecd8] tracking-tight">{dataFormatada} - <span className="text-[#d4af37]">{horarioResumo}</span></p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="p-3 rounded-2xl bg-[#d4af37]/10 text-[#d4af37]">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-[#8a6c74] uppercase tracking-widest mb-1">Serviços</p>
                <p className="text-lg font-brand-display font-black text-[#f4ecd8] tracking-tight uppercase">{nomeServico}</p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="p-3 rounded-2xl bg-[#d4af37]/10 text-[#d4af37]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-[#8a6c74] uppercase tracking-widest mb-1">Especialista</p>
                <p className="text-lg font-brand-display font-black text-[#f4ecd8] tracking-tight uppercase">{nomeProfissional}</p>
              </div>
            </div>

            {itensResumo.length > 1 && (
              <div className="rounded-[2rem] border border-[#d4af37]/20 bg-black/40 px-5 py-5 mt-8">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#8a6c74]">Itens da comanda</p>
                <div className="mt-4 space-y-3">
                  {itensResumo.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/5 bg-black/60 px-4 py-4 flex justify-between items-center">
                      <p className="text-xs font-brand-display font-black uppercase tracking-tight text-[#f4ecd8]">{item.titulo}</p>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#b299a0]">
                        {item.profissional} - <span className="text-[#d4af37]">{item.hora}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                const text = encodeURIComponent(`Olá! Acabei de marcar um horário em ${salao?.nome} para ${nomeServico} dia ${dataFormatada} às ${horarioResumo}.`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-[#25D366] to-[#1DA851] text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-[0_10px_20px_-10px_rgba(37,211,102,0.5)] hover:scale-[1.02] transition-all border border-white/20"
            >
              <Share2 size={18} /> Compartilhar no WhatsApp
            </button>

            <button
              onClick={() => window.location.reload()}
              className="premium-btn-secondary w-full py-5 text-xs tracking-[0.2em]"
            >
              Fazer novo agendamento
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col items-center gap-4">
            <p className="text-[9px] font-black text-[#8a6c74] uppercase tracking-[0.3em]">Dúvidas ou cancelamentos?</p>
            {salao?.telefone && (
              <a
                href={`tel:${salao.telefone}`}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-black/60 border border-[#d4af37]/20 shadow-[0_0_15px_rgba(212,175,55,0.05)] text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
              >
                <Phone size={16} />
                <span className="text-sm font-brand-display font-black tracking-widest">{salao.telefone}</span>
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
