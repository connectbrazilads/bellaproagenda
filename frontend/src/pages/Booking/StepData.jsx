import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Users } from 'lucide-react';
import { getDatasDisponiveis } from '../../services/api';
import { cn } from '../../lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function intersectDateLists(lists) {
  if (!lists.length) return [];
  const [first, ...rest] = lists;
  return first.filter((date) => rest.every((list) => list.includes(date)));
}

export default function StepData({ booking, set, next }) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [mais, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [datasDisponiveis, setDatasDisponiveis] = useState([]);
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(true);
  const [erroDisponibilidade, setErroDisponibilidade] = useState('');

  const primeiroDia = new Date(ano, mais, 1).getDay();
  const diasNoMes = new Date(ano, mais + 1, 0).getDate();
  const datasDisponiveisSet = useMemo(() => new Set(datasDisponiveis), [datasDisponiveis]);

  function formatarData(d) {
    return `${ano}-${String(mais + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function isPast(d) {
    const dt = new Date(ano, mais, d);
    return dt < hoje;
  }

  function isDisponivel(d) {
    return datasDisponiveisSet.has(formatarData(d));
  }

  function selecionar(d) {
    if (isPast(d) || !isDisponivel(d)) return;
    const dataEscolhida = formatarData(d);
    set('data', dataEscolhida);
    if (booking.multiProfissional) {
      set('multiItens', (booking.multiItens || []).map((item) => ({
        ...item,
        data: dataEscolhida,
        hora: '',
      })));
    }
    set('hora', '');
    next();
  }

  function mesAnterior() {
    if (mais === 0) {
      setMes(11);
      setAno((current) => current - 1);
      return;
    }
    setMes((current) => current - 1);
  }

  function proximoMes() {
    if (mais === 11) {
      setMes(0);
      setAno((current) => current + 1);
      return;
    }
    setMes((current) => current + 1);
  }

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        setLoadingDisponibilidade(true);
        setErroDisponibilidade('');

        if (booking.multiProfissional) {
          const itens = booking.multiItens || [];
          if (!itens.length) {
            setDatasDisponiveis([]);
            return;
          }

          const respostas = await Promise.all(itens.map((item) =>
            getDatasDisponiveis(booking.slug, {
              profissionalId: item.profissionalId,
              servicoId: item.servicoId,
              ano,
              mes: mais + 1,
            })
          ));

          if (cancelado) return;
          const listas = respostas.map((response) => response.data || []);
          setDatasDisponiveis(intersectDateLists(listas));
          return;
        }

        if (!booking.profissional?.id || !booking.servicos?.length) {
          setDatasDisponiveis([]);
          return;
        }

        const isPacote = booking.servicos[0]?.isPacote;
        const params = {
          profissionalId: booking.profissional.id,
          ano,
          mes: mais + 1,
          ...(isPacote ? { pacoteId: booking.servicos[0].id } : { servicoIds: booking.servicos.map((item) => item.id) }),
        };

        const response = await getDatasDisponiveis(booking.slug, params);
        if (cancelado) return;
        setDatasDisponiveis(response.data || []);
      } catch (error) {
        if (cancelado) return;
        setDatasDisponiveis([]);
        setErroDisponibilidade(error.response?.data?.error || 'Não foi possível consultar a agenda desta seleção.');
      } finally {
        if (!cancelado) setLoadingDisponibilidade(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [booking.slug, booking.profissional?.id, booking.servicos, booking.multiProfissional, booking.multiItens, ano, mais]);

  const dataAtual = booking.data
    ? new Date(`${booking.data}T00:00:00`)
    : null;

  const isPrevDisabled = ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mais <= hoje.getMonth());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAE1E4] bg-white">
          {booking.multiProfissional ? (
            <Users size={20} className="text-[#B84C6B]" />
          ) : booking.profissional?.fotoUrl ? (
            <img src={booking.profissional.fotoUrl} alt={booking.profissional.nome} className="h-full w-full object-cover" />
          ) : (
            <User size={20} className="text-[#8E7682]" />
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E7682]">
            {booking.multiProfissional ? 'Com equipe' : 'Agendando com'}
          </p>
          <p className="text-base font-bold text-[#23141C]">
            {booking.multiProfissional ? 'Especialistas por serviço' : booking.profissional?.nome}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#EAE1E4] bg-white">
        <div className="flex items-center justify-between border-b border-[#EAE1E4] bg-[#FAF7F5] px-5 py-4">
          <button
            type="button"
            onClick={mesAnterior}
            disabled={isPrevDisabled}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2D5DA] bg-white text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E7682]">{ano}</p>
            <h3 className="font-brand-display text-xl font-semibold text-[#23141C]">{MESES[mais]}</h3>
          </div>

          <button
            type="button"
            onClick={proximoMes}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2D5DA] bg-white text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-3 grid grid-cols-7 gap-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-[#8E7682]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: primeiroDia }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}

            {Array.from({ length: diasNoMes }).map((_, i) => {
              const d = i + 1;
              const past = isPast(d);
              const disponivel = isDisponivel(d);
              const disabled = past || !disponivel || loadingDisponibilidade;
              const selecionado = dataAtual
                && dataAtual.getDate() === d
                && dataAtual.getMonth() === mais
                && dataAtual.getFullYear() === ano;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => selecionar(d)}
                  disabled={disabled}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition',
                    selecionado
                      ? 'bg-[#23141C] text-white shadow-sm'
                      : !disabled
                        ? 'border border-[#EAE1E4] bg-white text-[#23141C] hover:border-[#B84C6B] hover:bg-[#FDF7F9] hover:text-[#B84C6B]'
                        : past
                          ? 'cursor-not-allowed text-[#D5C9CE]'
                          : 'cursor-not-allowed bg-[#FAF7F5] text-[#B8A8B0]',
                    loadingDisponibilidade && !past && 'opacity-45'
                  )}
                >
                  <span>{d}</span>
                  {!past && !selecionado && disponivel && (
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#B84C6B]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#8E7682]">
        <CalendarIcon size={14} className={loadingDisponibilidade ? 'animate-pulse text-[#B84C6B]' : 'text-[#B84C6B]'} />
        {loadingDisponibilidade ? 'Consultando disponibilidade...' : 'Datas com ponto rosé possuem horários livres'}
      </div>

      {erroDisponibilidade && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-center text-xs font-semibold text-rose-700">
          {erroDisponibilidade}
        </div>
      )}
    </div>
  );
}
