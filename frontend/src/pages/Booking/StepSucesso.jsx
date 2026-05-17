import React from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar, Clock, User, Phone, MessageSquare, Heart, Sparkles, Share2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StepSucesso({ agendamento, salao, cor }) {
  const dataBruta = agendamento?.data;
  const dataIso = typeof dataBruta === 'string' ? dataBruta.split('T')[0] : '';
  const [ano, mais, dia] = dataIso ? dataIso.split('-') : [];
  const dataFormatada = dia && mais && ano ? `${dia}/${mais}/${ano}` : '--/--/----';
  
  const nomeServico =
    agendamento?.serviço?.nome ||
    agendamento?.pacote?.nome ||
    agendamento?.itens?.map((item) => item.nome).join(' + ') ||
    '-';
  
  const nomeProfissional = agendamento?.profissional?.nome || '-';
  const horario = agendamento?.inicioHora || agendamento?.hora || '-';

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex items-center justify-center p-0 md:p-6 font-sans overflow-x-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white md:rounded-[3rem] shadow-2xl shadow-gray-200/50 p-8 md:p-12 text-center relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-500/5 blur-3xl rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-500/5 blur-3xl rounded-full" />

        <div className="relative z-10">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.1 }} className="relative z-10">
            <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl relative" style={{ backgroundColor: cor, boxShadow: `0 20px 40px -10px ${cor}66` }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Check size={40} strokeWidth={3} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.1 }}
                transition={{ delay: 0.4, duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute inset-0 border-4 rounded-[2.5rem]"
                style={{ borderColor: cor }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Tudo Pronto!</h1>
            <p className="text-gray-500 font-medium mb-10 max-w-xs mx-auto">
              Seu horario foi reservado com sucesso. Preparamos tudo para te receber!
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-50 rounded-[2.5rem] p-8 text-left space-y-6 mb-10 border border-gray-100 relative group"
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                   <Check size={14} style={{ color: cor }} />
                 </div>
                 <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border" style={{ backgroundColor: `${cor}1A`, color: cor, borderColor: `${cor}33` }}>
                   Reserva confirmada
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
               <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Data e Horário</p>
                     <p className="text-lg font-black text-gray-900 tracking-tight">{dataFormatada} às {horario}</p>
                  </div>
               </div>

               <div className="flex items-start gap-4">
                  <Heart className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Serviço</p>
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
            </div>
          </motion.div>

          <div className="space-y-4">
            <button
              onClick={() => {
                const text = encodeURIComponent(`Olá! Acabei de marcar um horario em ${salao?.nome} para ${nomeServico} dia ${dataFormatada} às ${horario}. ✨`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full py-6 rounded-[2rem] bg-[#25D366] text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/10 hover:scale-[1.02] transition-all"
            >
               <Share2 size={18} /> Compartilhar não WhatsApp
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-6 rounded-[2rem] bg-gray-100 text-gray-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-all"
            >
              Fazer não agendamento
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center gap-4">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Dúvidas ou cancelamentos?</p>
            {salao?.telefone && (
              <a 
                href={`tel:${salao.telefone}`}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-600 hover:text-purple-600 transition-colors"
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
