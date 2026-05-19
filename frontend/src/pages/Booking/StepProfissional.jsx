import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Zap, Users } from 'lucide-react';
import { getProfissionaisPorServico, getProfissionaisPorPacote } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepProfissional({ booking, set, next, cor }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avisoFlexivel, setAvisoFlexivel] = useState(false);

  useEffect(() => {
    const selecionados = booking.servicos || [];
    if (selecionados.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const carregarProfissionais = async () => {
      const respostas = await Promise.all(
        selecionados.map((item) => {
          const fetcher = item.isPacote ? getProfissionaisPorPacote : getProfissionaisPorServico;
          return fetcher(booking.slug, item.id);
        })
      );

      const listas = respostas.map((resposta) => resposta.data || []);
      const idsComuns = listas.reduce((acc, lista, index) => {
        const ids = new Set(lista.map((profissional) => profissional.id));
        if (index === 0) return ids;
        return new Set([...acc].filter((id) => ids.has(id)));
      }, new Set());

      let profissionaisFiltrados = (listas[0] || []).filter((profissional) => idsComuns.has(profissional.id));
      let flex = false;

      if (profissionaisFiltrados.length === 0) {
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

      setProfissionais(profissionaisFiltrados);
      setAvisoFlexivel(flex);
    };

    carregarProfissionais()
      .catch(() => setProfissionais([]))
      .finally(() => setLoading(false));
  }, [booking.slug, booking.servicos]);

  function selecionar(profissional) {
    set('profissional', profissional);
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

  if (profissionais.length === 0) {
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

  return (
    <div className="space-y-8">
      {avisoFlexivel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-4 rounded-3xl border border-amber-100 bg-amber-50 p-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-50 bg-white text-amber-500 shadow-sm">
            <Star size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-tight text-amber-900">Selecao Flexivel Ativa</p>
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-amber-700">
              Nao encontramos um unico profissional que realize todos os servicos escolhidos ao mesmo tempo.
              Exibindo especialistas que atendem parte do seu pedido.
            </p>
          </div>
        </motion.div>
      )}

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
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 transition-all group-hover:translate-x-2 group-hover:opacity-100">
            <Star className="h-5 w-5 animate-pulse text-amber-400" fill="currentColor" />
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="w-full space-y-1 text-center">
                <h3 className="truncate text-lg font-black uppercase leading-none tracking-tighter text-gray-900 md:text-xl">
                  {profissional.nome}
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex -space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={10} fill="#fbbf24" className="text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expert</span>
                </div>
                {profissional.categorias?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {profissional.categorias.slice(0, 2).map((item) => (
                      <span
                        key={item.categoria?.id || item.categoriaId}
                        className="rounded-full bg-purple-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-purple-600"
                      >
                        {item.categoria?.nome}
                      </span>
                    ))}
                  </div>
                )}
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

              {idx === 0 && (
                <div className="absolute -right-3 -top-3 rotate-12 rounded-xl bg-amber-400 p-2 text-white shadow-lg">
                  <Star size={14} fill="currentColor" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
