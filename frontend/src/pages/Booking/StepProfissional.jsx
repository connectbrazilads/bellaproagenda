import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Award, Star, Zap, Users } from 'lucide-react';
import { getProfissionaisPorServico, getProfissionaisPorPacote } from '../../services/api';
import { cn } from '../../lib/utils';

export default function StepProfissional({ booking, set, next, cor }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);

  const [avisoFlexivel, setAvisoFlexivel] = useState(false);

  useEffect(() => {
    const selecionados = booking.serviços || [];
    if (selecionados.length === 0) { setLoading(false); return; }

    setLoading(true);

    const carregarProfissionais = async () => {
      const respostas = await Promise.all(
        selecionados.map((item) => {
          const fetcher = item.isPacote ? getProfissionaisPorPacote : getProfissionaisPorServico;
          return fetcher(booking.slug, item.id);
        })
      );

      const listas = respostas.map((resposta) => resposta.data || []);
      
      // Se??o visual BellaPro
      const idsTudo = listas.reduce((acc, lista, index) => {
        const ids = new Set(lista.map((p) => p.id));
        if (index === 0) return ids;
        return new Set([...acc].filter((id) => ids.has(id)));
      }, new Set());

      let profissionaisFiltrados = listas[0].filter((p) => idsTudo.has(p.id));
      let flex = false;

      // Se??o visual BellaPro
      if (profissionaisFiltrados.length === 0) {
        const todosIds = new Set();
        const todosProfissionais = [];
        listas.forEach(lista => {
          lista.forEach(p => {
            if (!todosIds.has(p.id)) {
              todosIds.add(p.id);
              todosProfissionais.push(p);
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
  }, [booking.slug, booking.serviços]);

  function selecionar(prof) {
    set('profissional', prof);
    set('data', '');
    set('hora', '');
    next();
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Buscando especialistas</p>
    </div>
  );

  if (profissionais.length === 0) {
    return (
      <div className="py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
           <Users size={40} />
        </div>
        <div>
          <p className="text-xl font-black text-gray-900 uppercase tracking-tight">Nenhum profissional compatível</p>
          <p className="mt-2 text-sm text-gray-400 max-w-xs mx-auto">Não encontramos profissionais disponíveis para todos os serviços selecionados. Tente ajustar sua escolha.</p>
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
          className="p-5 rounded-3xl bg-amber-50 border border-amber-100 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-amber-500 shrink-0 border border-amber-50">
             <Star size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Sele??o Flexível Ativa</p>
            <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-1">
              Não encontramos um únão profissional que realize todos os serviços escolhidos simultaneamente. 
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
          className="group relative p-6 rounded-[2rem] border-2 border-dashed border-gray-100 hover:border-purple-500/30 transition-all text-left bg-gray-50/50 hover:bg-white overflow-hidden"
        >
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center text-purple-600 border border-gray-50 group-hover:scale-110 transition-transform">
               <Zap size={28} fill="currentColor" className="opacity-20" />
               <Users size={28} className="absolute" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg leading-none">O Primeiro Disponível</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Escolha automática para maior agilidade</p>
            </div>
          </div>
          <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
             <Star className="text-amber-400 w-5 h-5 animate-pulse" fill="currentColor" />
          </div>
        </motion.button>
      </div>

      <div className="relative">
        <div className="flex items-center gap-4 mb-6">
           <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Especialistas BellaPro</span>
           <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-h-[500px] overflow-y-auto px-1 custom-scrollbar pb-10">
          {profissionais.map((prof, idx) => (
            <motion.button
              key={prof.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selecionar(prof)}
              className={cn(
                "group relative p-6 rounded-[2.5rem] border-2 transition-all bg-white text-left flex flex-col items-center gap-5",
                booking.profissional?.id === prof.id ? "border-purple-500 shadow-2xl shadow-purple-500/10" : "border-gray-50 shadow-lg shadow-gray-200/20 hover:border-purple-500/20"
              )}
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-[2.2rem] bg-gray-50 border-4 border-white overflow-hidden flex-shrink-0 relative shadow-xl">
                {prof.fotoUrl ? (
                  <img src={prof.fotoUrl} alt={prof.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200 bg-gray-50">
                    <User size={48} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="text-center w-full space-y-1">
                <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg md:text-xl truncate leading-none">{prof.nome}</h3>
                <div className="flex items-center justify-center gap-2">
                   <div className="flex -space-x-1">
                      {[1,2,3,4,5].map(s => <Star key={s} size={10} fill="#fbbf24" className="text-amber-400" />)}
                   </div>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expert</span>
                </div>
                {prof.categorias?.length > 0 && (
                  <div className="pt-2 flex flex-wrap justify-center gap-2">
                    {prof.categorias.slice(0, 2).map((item) => (
                      <span key={item.categoria?.id || item.categoriaId} className="rounded-full bg-purple-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-purple-600">
                        {item.categoria?.nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div 
                className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center transition-all"
                style={{ 
                  backgroundColor: booking.profissional?.id === prof.id ? cor : '#f9fafb',
                  color: booking.profissional?.id === prof.id ? 'white' : '#9ca3af'
                }}
              >
                {booking.profissional?.id === prof.id ? 'Sele??o' : 'Selecionar Especialista'}
              </div>

              {idx === 0 && (
                <div className="absolute -top-3 -right-3 bg-amber-400 text-white p-2 rounded-xl shadow-lg rotate-12">
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
