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
    ? listaAgendamentos.map((item) => item?.servico?.nome || item?.pacote?.nome || 'Servico').join(' + ')
    : (agendamentoBase?.servico?.nome || agendamentoBase?.pacote?.nome || agendamentoBase?.itens?.map((item) => item.nome).join(' + ') || '-');

  const nomeProfissional = listaAgendamentos.length
    ? 'Equipe do salao'
    : (agendamentoBase?.profissional?.nome || '-');

  const horarioResumo = listaAgendamentos.length
    ? listaAgendamentos.map((item) => `${item?.servico?.nome || 'Servico'} ${item?.inicioHora || '-'}`).join(' | ')
    : (agendamentoBase?.inicioHora || agendamentoBase?.hora || '-');

  const itensResumo = listaAgendamentos.length
    ? listaAgendamentos.map((item) => ({
        id: item.id,
        titulo: item?.servico?.nome || item?.pacote?.nome || 'Servico',
        profissional: item?.profissional?.nome || 'Equipe',
        hora: item?.inicioHora || '-',
      }))
    : [];

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex items-center justify-center p-0 md:p-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white md:rounded-[3rem] shadow-2xl shadow-gray-200/40 p-8 md:p-12 text-center relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl" style={{ backgroundColor: cor }}>
            <Check size={40} strokeWidth={3} />
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Tudo Pronto!</h1>
          <p className="text-gray-500 font-medium mb-10 max-w-xs mx-auto">
            Sua reserva foi criada com sucesso. Preparamos tudo para te receber!
          </p>

          <div className="bg-gray-50 rounded-[2.5rem] p-8 text-left space-y-6 mb-10 border border-gray-100">
            <div className="flex items-start gap-4">
              <Calendar className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Data e horario</p>
                <p className="text-lg font-black text-gray-900 tracking-tight">{dataFormatada} - {horarioResumo}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Heart className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Servicos</p>
                <p className="text-lg font-black text-gray-900 tracking-tight uppercase">{nomeServico}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <User className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Especialista</p>
                <p className="text-lg font-black text-gray-900 tracking-tight uppercase">{nomeProfissional}</p>
              </div>
            </div>

            {itensResumo.length > 1 && (
              <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Itens da comanda</p>
                <div className="mt-3 space-y-3">
                  {itensResumo.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 px-4 py-3">
                      <p className="text-sm font-black uppercase tracking-tight text-gray-900">{item.titulo}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                        {item.profissional} - {item.hora}
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
                const text = encodeURIComponent(`Ola! Acabei de marcar um horario em ${salao?.nome} para ${nomeServico} dia ${dataFormatada} as ${horarioResumo}.`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full py-6 rounded-[2rem] bg-[#25D366] text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 hover:scale-[1.02] transition-all"
            >
              <Share2 size={18} /> Compartilhar no WhatsApp
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-6 rounded-[2rem] bg-gray-100 text-gray-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-all"
            >
              Fazer novo agendamento
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center gap-4">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Duvidas ou cancelamentos?</p>
            {salao?.telefone && (
              <a
                href={`tel:${salao.telefone}`}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-600"
              >
                <Phone size={16} />
                <span className="text-sm font-black tracking-tight">{salao.telefone}</span>
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
