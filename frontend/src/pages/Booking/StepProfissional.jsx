import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Zap, Users, CheckCircle2 } from 'lucide-react';
import { getProfissionaisPorServico, getProfissionaisPorPacote } from '../../services/api';
import { cn } from '../../lib/utils';

const CARREGAMENTO_MAX_MS = 12000;

function buildSyntheticTeamSelection(multiItens) {
  return {
    id: 'multi',
    nome: 'Equipe do salao',
    fotoUrl: null,
    multiItens,
  };
}

export default function StepProfissional({ booking, set, next, cor }) {
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
            `A busca de especialistas para ${item.nome || 'este servico'} demorou demais.`
          );
        })
      );

      if (cancelado) return;

      const rejeitado = respostas.find((resultado) => resultado.status === 'rejected');
      if (rejeitado) {
        throw rejeitado.reason || new Error('Nao foi possivel carregar especialistas no momento.');
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
        setErroCarregamento(error?.message || 'Nao foi possivel carregar especialistas no momento.');
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
      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-100 border-t-purple-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Buscando especialistas</p>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="space-y-6 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-50 text-rose-300">
          <Users size={40} />
        </div>
        <div>
          <p className="text-xl font-black uppercase tracking-tight text-gray-900">Nao conseguimos carregar</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-gray-400">
            {erroCarregamento}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTentativa((current) => current + 1)}
          style={{ backgroundColor: cor }}
          className="rounded-[2rem] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!avisoFlexivel && profissionais.length === 0) {
    return (
      <div className="space-y-6 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gray-50 text-gray-300">
          <Users size={40} />
        </div>
        <div>
          <p className="text-xl font-black uppercase tracking-tight text-gray-900">Nenhum profissional compativel</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-gray-400">
            Nao encontramos profissionais disponiveis para todos os servicos selecionados. Tente ajustar sua escolha.
          </p>
        </div>
      </div>
    );
  }

  if (avisoFlexivel) {
    return (
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-amber-100 bg-amber-50 p-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-50 bg-white text-amber-500 shadow-sm">
              <Star size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-tight text-amber-900">Modo multi-profissional</p>
              <p className="mt-1 text-[10px] font-medium leading-relaxed text-amber-700">
                Nao existe um unico profissional para todos os servicos. Escolha um especialista para cada item da comanda.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-5">
          {servicosSelecionados.map((servico, idx) => {
            const profissionaisDoServico = profissionaisPorServico[servico.id] || [];
            const selecionado = multiSelecionado[servico.id];

            return (
              <motion.div
                key={servico.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-[2.2rem] border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/20"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a58690]">Servico</p>
                    <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-gray-900">{servico.nome}</h3>
                  </div>
                  {selecionado && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      <CheckCircle2 size={14} />
                      {selecionado.nome}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {profissionaisDoServico.map((profissional) => (
                    <button
                      key={`${servico.id}-${profissional.id}`}
                      type="button"
                      onClick={() => selecionarProfissionalDoServico(servico, profissional)}
                      className={cn(
                        'rounded-[1.8rem] border-2 p-4 text-left transition-all',
                        selecionado?.id === profissional.id
                          ? 'border-[#d48997] bg-rose-50 shadow-xl shadow-[#d48997]/10'
                          : 'border-gray-100 bg-gray-50/70 hover:border-[#d48997]/30 hover:bg-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
                          {profissional.fotoUrl ? (
                            <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover" />
                          ) : (
                            <User size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase tracking-[0.12em] text-gray-900">{profissional.nome}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Especialista deste servico</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={continuarMulti}
          disabled={multiItensProntos.length !== servicosSelecionados.length}
          style={{ backgroundColor: cor }}
          className="w-full rounded-[2rem] py-5 text-sm font-black uppercase tracking-[0.22em] text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar com equipe
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => selecionar({ id: 'any', nome: 'Qualquer Profissional', fotoUrl: null })}
          className="group relative overflow-hidden rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/50 p-6 text-left transition-all hover:border-purple-500/30 hover:bg-white"
        >
          <div className="relative z-10 flex items-center gap-5">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-50 bg-white text-purple-600 shadow-xl transition-transform group-hover:scale-110">
              <Zap size={28} fill="currentColor" className="opacity-20" />
              <Users size={28} className="absolute" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase leading-none tracking-tighter text-gray-900">O Primeiro Disponivel</h3>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Escolha automatica para maior agilidade</p>
            </div>
          </div>
        </motion.button>
      </div>

      <div className="relative">
        <div className="mb-6 flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">Especialistas BellaPro</span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="custom-scrollbar grid max-h-[500px] grid-cols-1 gap-4 overflow-y-auto px-1 pb-10 sm:grid-cols-2 md:gap-6">
          {profissionais.map((profissional, idx) => (
            <motion.button
              key={profissional.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selecionar(profissional)}
              className={cn(
                'group relative flex flex-col items-center gap-5 rounded-[2.5rem] border-2 bg-white p-6 text-left transition-all',
                booking.profissional?.id === profissional.id
                  ? 'border-purple-500 shadow-2xl shadow-purple-500/10'
                  : 'border-gray-50 shadow-lg shadow-gray-200/20 hover:border-purple-500/20'
              )}
            >
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[2.2rem] border-4 border-white bg-gray-50 shadow-xl md:h-32 md:w-32">
                {profissional.fotoUrl ? (
                  <img
                    src={profissional.fotoUrl}
                    alt={profissional.nome}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-200">
                    <User size={48} strokeWidth={1} />
                  </div>
                )}
              </div>

              <div className="w-full space-y-1 text-center">
                <h3 className="truncate text-lg font-black uppercase leading-none tracking-tighter text-gray-900 md:text-xl">
                  {profissional.nome}
                </h3>
              </div>

              <div
                className="w-full rounded-2xl py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                style={{
                  backgroundColor: booking.profissional?.id === profissional.id ? cor : '#f9fafb',
                  color: booking.profissional?.id === profissional.id ? 'white' : '#9ca3af',
                }}
              >
                {booking.profissional?.id === profissional.id ? 'Selecao' : 'Selecionar Especialista'}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
