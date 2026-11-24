import React, { useEffect, useMemo, useState } from 'react';
import { User, Star, Zap, Users, CheckCircle2 } from 'lucide-react';
import { getProfissionaisPorServico, getProfissionaisPorPacote } from '../../services/api';
import { cn } from '../../lib/utils';

const CARREGAMENTO_MAX_MS = 12000;

function buildSyntheticTeamSelection(multiItens) {
  return {
    id: 'multi',
    nome: 'Equipe do salão',
    fotoUrl: null,
    multiItens,
  };
}

export default function StepProfissional({ booking, set, next }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avisoFlexivel, setAvisoFlexivel] = useState(false);
  const [profissionaisPorServico, setProfissionaisPorServico] = useState({});
  const [multiSelecionado, setMultiSelecionado] = useState({});
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const servicosKey = useMemo(
    () => (booking.servicos || []).map((item) => `${item.id}:${item.isPacote ? '1' : '0'}`).join('|'),
    [booking.servicos]
  );

  function comTimeout(promise, label) {
    let timerId;
    const timeout = new Promise((_, reject) => {
      timerId = setTimeout(() => reject(new Error(label)), CARREGAMENTO_MAX_MS);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
  }

  useEffect(() => {
    const selecionados = booking.servicos || [];
    let cancelado = false;

    if (selecionados.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErroCarregamento('');

    const carregarProfissionais = async () => {
      const respostas = await Promise.allSettled(
        selecionados.map((item) => {
          const fetcher = item.isPacote ? getProfissionaisPorPacote : getProfissionaisPorServico;
          return comTimeout(
            fetcher(booking.slug, item.id),
            `A busca de especialistas para ${item.nome || 'este serviço'} demorou demais.`
          );
        })
      );

      if (cancelado) return;

      const rejeitado = respostas.find((resultado) => resultado.status === 'rejected');
      if (rejeitado) {
        throw rejeitado.reason || new Error('Não foi possível carregar especialistas no momento.');
      }

      const listas = respostas.map((resposta) => resposta.value?.data || []);
      const idsComuns = listas.reduce((acc, lista, index) => {
        const ids = new Set(lista.map((profissional) => profissional.id));
        if (index === 0) return ids;
        return new Set([...acc].filter((id) => ids.has(id)));
      }, new Set());

      const mapaPorServico = {};
      selecionados.forEach((item, index) => {
        mapaPorServico[item.id] = listas[index] || [];
      });

      let profissionaisFiltrados = (listas[0] || []).filter((profissional) => idsComuns.has(profissional.id));
      let flex = false;

      if (profissionaisFiltrados.length === 0 && selecionados.length > 1) {
        const todosIds = new Set();
        const todosProfissionais = [];

        listas.forEach((lista) => {
          lista.forEach((profissional) => {
            if (!todosIds.has(profissional.id)) {
              todosIds.add(profissional.id);
              todosProfissionais.push(profissional);
            }
          });
        });

        profissionaisFiltrados = todosProfissionais;
        flex = true;
      }

      setProfissionaisPorServico(mapaPorServico);
      setProfissionais(profissionaisFiltrados);
      setAvisoFlexivel(flex);

      if (!flex) {
        setMultiSelecionado({});
        set('multiProfissional', false);
        set('multiItens', []);
      }
    };

    carregarProfissionais()
      .catch((error) => {
        if (cancelado) return;
        setProfissionais([]);
        setProfissionaisPorServico({});
        setAvisoFlexivel(false);
        setErroCarregamento(error?.message || 'Não foi possível carregar especialistas no momento.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [booking.slug, servicosKey, set, tentativa]);

  const servicosSelecionados = booking.servicos || [];
  const multiItensProntos = useMemo(() => servicosSelecionados.map((servico) => {
    const profissional = multiSelecionado[servico.id];
    return profissional ? {
      servicoId: servico.id,
      servicoNome: servico.nome,
      preco: servico.preco,
      profissionalId: profissional.id,
      profissionalNome: profissional.nome,
      profissional,
    } : null;
  }).filter(Boolean), [multiSelecionado, servicosSelecionados]);

  function selecionar(profissional) {
    set('profissional', profissional);
    set('multiProfissional', false);
    set('multiItens', []);
    set('data', '');
    set('hora', '');
    next();
  }

  function selecionarProfissionalDoServico(servico, profissional) {
    setMultiSelecionado((current) => ({
      ...current,
      [servico.id]: profissional,
    }));
  }

  function continuarMulti() {
    if (multiItensProntos.length !== servicosSelecionados.length) return;

    set('profissional', buildSyntheticTeamSelection(multiItensProntos));
    set('multiProfissional', true);
    set('multiItens', multiItensProntos.map((item) => ({
      ...item,
      data: '',
      hora: '',
    })));
    set('data', '');
    set('hora', '');
    next();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#EAE1E4] border-t-[#B84C6B]" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8E7682]">Buscando especialistas</p>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="space-y-5 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
          <Users size={30} />
        </div>
        <div>
          <p className="font-brand-display text-2xl font-semibold text-[#23141C]">Não conseguimos carregar</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#6B5761]">{erroCarregamento}</p>
        </div>
        <button
          type="button"
          onClick={() => setTentativa((current) => current + 1)}
          className="rounded-xl border border-[#E2D5DA] bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#23141C] transition hover:border-[#B84C6B] hover:text-[#B84C6B]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!avisoFlexivel && profissionais.length === 0) {
    return (
      <div className="space-y-4 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] text-[#B84C6B]">
          <Users size={30} />
        </div>
        <div>
          <p className="font-brand-display text-2xl font-semibold text-[#23141C]">Nenhum especialista disponível</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-[#6B5761]">
            Não encontramos profissionais disponíveis para todos os serviços selecionados. Tente ajustar sua escolha.
          </p>
        </div>
      </div>
    );
  }

  if (avisoFlexivel) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#F0D5DE] bg-[#FDF7F9] p-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B84C6B] text-white">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B84C6B]">Modo multi-profissional</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6B5761]">
                Não existe um único especialista para todos os serviços. Escolha um profissional para cada item da comanda.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {servicosSelecionados.map((servico) => {
            const profissionaisDoServico = profissionaisPorServico[servico.id] || [];
            const selecionado = multiSelecionado[servico.id];

            return (
              <div key={servico.id} className="rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8E7682]">Serviço</p>
                    <h3 className="mt-0.5 text-base font-bold text-[#23141C]">{servico.nome}</h3>
                  </div>
                  {selecionado && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D5DE] bg-white px-3 py-1 text-[11px] font-bold text-[#B84C6B]">
                      <CheckCircle2 size={13} />
                      {selecionado.nome}
                    </span>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {profissionaisDoServico.map((profissional) => (
                    <button
                      key={`${servico.id}-${profissional.id}`}
                      type="button"
                      onClick={() => selecionarProfissionalDoServico(servico, profissional)}
                      className={cn(
                        'rounded-2xl border p-3.5 text-left transition',
                        selecionado?.id === profissional.id
                          ? 'border-[#B84C6B] bg-white ring-1 ring-[#B84C6B]/20'
                          : 'border-[#EAE1E4] bg-white hover:border-[#D9C6CE]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAE1E4] bg-[#FAF7F5]">
                          {profissional.fotoUrl ? (
                            <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover" />
                          ) : (
                            <User size={18} className="text-[#8E7682]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#23141C]">{profissional.nome}</p>
                          <p className="text-[11px] text-[#8E7682]">Especialista</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={continuarMulti}
          disabled={multiItensProntos.length !== servicosSelecionados.length}
          className="w-full rounded-2xl bg-[#B84C6B] py-4 text-sm font-bold text-white transition hover:bg-[#9E3E5A] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continuar com equipe
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => selecionar({ id: 'any', nome: 'Qualquer Profissional', fotoUrl: null })}
        className="group w-full rounded-2xl border border-dashed border-[#D9C6CE] bg-[#FAF7F5] p-4 text-left transition hover:border-[#B84C6B] hover:bg-[#FDF7F9]"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#23141C] text-white">
            <Zap size={20} className="text-[#E6A3B5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#23141C]">O Primeiro Disponível</h3>
            <p className="mt-0.5 text-xs text-[#6B5761]">Agendamento mais rápido com qualquer especialista livre</p>
          </div>
        </div>
      </button>

      <div>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E7682]">Nossos Especialistas</span>
          <div className="h-px flex-1 bg-[#EAE1E4]" />
        </div>

        <div className="custom-scrollbar grid max-h-[430px] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          {profissionais.map((profissional) => {
            const isSelected = booking.profissional?.id === profissional.id;
            return (
              <button
                key={profissional.id}
                type="button"
                onClick={() => selecionar(profissional)}
                className={cn(
                  'group flex flex-col items-center gap-4 rounded-2xl border p-5 text-center transition',
                  isSelected
                    ? 'border-[#B84C6B] bg-[#FDF7F9] ring-1 ring-[#B84C6B]/20'
                    : 'border-[#EAE1E4] bg-white hover:border-[#D9C6CE] hover:bg-[#FCFAFB]'
                )}
              >
                <div className="h-24 w-24 overflow-hidden rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5]">
                  {profissional.fotoUrl ? (
                    <img
                      src={profissional.fotoUrl}
                      alt={profissional.nome}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#9E8792]">
                      <User size={36} strokeWidth={1.4} />
                    </div>
                  )}
                </div>

                <h3 className="w-full truncate text-base font-bold text-[#23141C]">{profissional.nome}</h3>

                <span
                  className={cn(
                    'w-full rounded-xl py-2.5 text-xs font-bold transition',
                    isSelected
                      ? 'bg-[#23141C] text-white'
                      : 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#6B5761] group-hover:border-[#B84C6B] group-hover:text-[#B84C6B]'
                  )}
                >
                  {isSelected ? 'Selecionado' : 'Escolher especialista'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
