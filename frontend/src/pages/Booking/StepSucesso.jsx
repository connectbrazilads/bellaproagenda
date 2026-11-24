import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar, User, Phone, Share2, Heart } from 'lucide-react';

export default function StepSucesso({ agendamento, salao }) {
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
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F5] px-4 py-10 text-[#23141C] sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl text-center"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <Check size={38} strokeWidth={2.8} />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">Reserva confirmada</p>
        <h1 className="mt-2 font-brand-display text-4xl font-semibold tracking-tight text-[#23141C] sm:text-5xl">
          Tudo Pronto!
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#6B5761]">
          Sua reserva foi criada com sucesso em <strong className="text-[#23141C]">{salao?.nome}</strong>. Esperamos por você!
        </p>

        <div className="mt-8 space-y-5 rounded-3xl border border-[#EAE1E4] bg-white p-6 text-left shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDF7F9] text-[#B84C6B]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8E7682]">Data e horário</p>
              <p className="mt-0.5 text-base font-bold text-[#23141C]">
                {dataFormatada} · <span className="text-[#B84C6B]">{horarioResumo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDF7F9] text-[#B84C6B]">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8E7682]">Serviços</p>
              <p className="mt-0.5 text-base font-bold text-[#23141C]">{nomeServico}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDF7F9] text-[#B84C6B]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8E7682]">Especialista</p>
              <p className="mt-0.5 text-base font-bold text-[#23141C]">{nomeProfissional}</p>
            </div>
          </div>

          {itensResumo.length > 1 && (
            <div className="rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8E7682]">Itens da comanda</p>
              <div className="mt-3 space-y-2">
                {itensResumo.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#EAE1E4] bg-white px-3.5 py-2.5 text-xs">
                    <span className="font-bold text-[#23141C]">{item.titulo}</span>
                    <span className="text-[#6B5761]">
                      {item.profissional} · <strong className="text-[#B84C6B]">{item.hora}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => {
              const text = encodeURIComponent(`Olá! Acabei de marcar um horário em ${salao?.nome || 'seu salão'} para ${nomeServico} dia ${dataFormatada} às ${horarioResumo}.`);
              window.open(`https://wa.me/${salao?.whatsapp || salao?.telefone || ''}?text=${text}`, '_blank');
            }}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1DA851] py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#179045]"
          >
            <Share2 size={18} />
            Confirmar no WhatsApp do Salão
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl border border-[#E2D5DA] bg-white py-3.5 text-sm font-bold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]"
          >
            Fazer novo agendamento
          </button>
        </div>

        {salao?.telefone && (
          <div className="mt-8 flex flex-col items-center gap-2 border-t border-[#EAE1E4] pt-6">
            <p className="text-xs font-medium text-[#8E7682]">Dúvidas ou reagendamentos?</p>
            <a
              href={`tel:${salao.telefone}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#EAE1E4] bg-white px-5 py-2.5 text-sm font-semibold text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]"
            >
              <Phone size={15} className="text-[#B84C6B]" />
              <span>{salao.telefone}</span>
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}
