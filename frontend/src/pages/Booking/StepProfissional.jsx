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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d4af37]/10 border-t-[#d4af37]" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4af37]">Buscando especialistas</p>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="space-y-6 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Users size={40} />
        </div>
        <div>
          <p className="text-xl font-brand-display font-black tracking-tight text-[#f4ecd8]">Não conseguimos carregar</p>
          <p className="mx-auto mt-2 max-w-xs text-[11px] font-light leading-relaxed text-[#b299a0]">
            {erroCarregamento}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTentativa((current) => current + 1)}
          className="premium-btn-secondary px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!avisoFlexivel && profissionais.length === 0) {
    return (
      <div className="space-y-6 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-black/40 border border-white/10 text-[#d4af37]">
          <Users size={40} />
        </div>
        <div>
          <p className="text-xl font-brand-display font-black tracking-tight text-[#f4ecd8]">Nenhum especialista disponível</p>
          <p className="mx-auto mt-2 max-w-xs text-[11px] font-light leading-relaxed text-[#b299a0]">
            Não encontramos profissionais disponíveis para todos os serviços selecionados. Tente ajustar sua escolha.
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
          className="rounded-[2rem] border border-[#d4af37]/30 bg-[#d4af37]/5 p-5 backdrop-blur-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-black/40 text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Star size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#d4af37]">Modo multi-profissional</p>
              <p className="mt-1.5 text-[11px] font-light leading-relaxed text-[#f4ecd8]">
                Não existe um único especialista para todos os serviços. Escolha um para cada item da comanda.
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
                className="glass-card-neon rounded-[2.5rem] p-6"
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#8a6c74]">Serviço</p>
                    <h3 className="mt-1 text-lg font-brand-display font-black tracking-tight text-[#f4ecd8]">{servico.nome}</h3>
                  </div>
                  {selecionado && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#d4af37]">
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
                        'group rounded-[2rem] border p-4 text-left transition-all',
                        selecionado?.id === profissional.id
                          ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                          : 'border-white/10 bg-black/40 hover:border-[#d4af37]/40 hover:bg-black/60'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/60 shadow-sm">
                          {profissional.fotoUrl ? (
                            <img src={profissional.fotoUrl} alt={profissional.nome} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <User size={20} className="text-[#8a6c74]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase tracking-[0.1em] text-[#f4ecd8] group-hover:text-[#d4af37] transition-colors">{profissional.nome}</p>
                          <p className="mt-1 text-[9px] font-light uppercase tracking-[0.2em] text-[#b299a0]">Especialista</p>
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
          className="premium-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:filter-grayscale"
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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => selecionar({ id: 'any', nome: 'Qualquer Profissional', fotoUrl: null })}
          className="group relative overflow-hidden rounded-[2.5rem] border border-dashed border-[#d4af37]/30 bg-black/40 p-6 text-left transition-all hover:border-[#d4af37] hover:bg-[#d4af37]/5"
        >
          <div className="relative z-10 flex items-center gap-6">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-transform group-hover:scale-110">
              <Zap size={28} fill="currentColor" className="opacity-20" />
              <Users size={28} className="absolute" />
            </div>
            <div>
              <h3 className="text-xl font-brand-display font-black uppercase tracking-tight text-[#f4ecd8] group-hover:text-[#d4af37] transition-colors">O Primeiro Disponível</h3>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b299a0]">Agendamento ultra rápido e prático</p>
            </div>
          </div>
        </motion.button>
      </div>

      <div className="relative">
        <div className="mb-8 flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d4af37]">Nossos Especialistas</span>
          <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/30 to-transparent" />
        </div>

        <div className="custom-scrollbar grid max-h-[500px] grid-cols-1 gap-5 overflow-y-auto px-1 pb-10 sm:grid-cols-2 md:gap-6">
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
                'group relative flex flex-col items-center gap-5 rounded-[2.5rem] border p-6 text-center transition-all',
                booking.profissional?.id === profissional.id
                  ? 'border-[#d4af37] bg-[#d4af37]/10 shadow-[0_0_20px_rgba(212,175,55,0.2)] backdrop-blur-md'
                  : 'border-white/10 bg-black/40 shadow-xl hover:border-[#d4af37]/40 hover:bg-black/60'
              )}
            >
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[2.2rem] border-2 border-white/10 bg-black/60 shadow-2xl md:h-32 md:w-32 group-hover:border-[#d4af37]/50 transition-colors">
                {profissional.fotoUrl ? (
                  <img
                    src={profissional.fotoUrl}
                    alt={profissional.nome}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black/40 text-[#8a6c74]">
                    <User size={48} strokeWidth={1} />
                  </div>
                )}
              </div>

              <div className="w-full space-y-1">
                <h3 className="truncate text-lg font-brand-display font-black uppercase tracking-tight text-[#f4ecd8] group-hover:text-[#d4af37] transition-colors md:text-xl">
                  {profissional.nome}
                </h3>
              </div>

              <div
                className="w-full rounded-full py-3.5 text-center text-[10px] font-black uppercase tracking-[0.25em] transition-all"
                style={{
                  backgroundColor: booking.profissional?.id === profissional.id ? '#d4af37' : 'rgba(255,255,255,0.03)',
                  color: booking.profissional?.id === profissional.id ? '#000' : '#8a6c74',
                  border: booking.profissional?.id === profissional.id ? 'none' : '1px solid rgba(255,255,255,0.08)'
                }}
              >
                {booking.profissional?.id === profissional.id ? 'Selecionado' : 'Escolher Especialista'}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
