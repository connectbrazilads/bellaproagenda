import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Search, CreditCard, Banknote, Smartphone, CheckCircle } from 'lucide-react';
import { getProdutos, criarVendaPDV } from '../services/api';
import { cn } from '../lib/utils';

export default function ModalPDV() {
  const [open, setOpen] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState([]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      loadProdutos();
    };
    window.addEventListener('open-pdv', handleOpen);
    return () => window.removeEventListener('open-pdv', handleOpen);
  }, []);

  async function loadProdutos() {
    try {
      const res = await getProdutos();
      setProdutos(res.data.filter(p => p.ativo && p.estoque > 0));
    } catch (e) {
      console.error(e);
    }
  }

  const handleClose = () => {
    setOpen(false);
    setCarrinho([]);
    setClienteNome('');
    setClienteTelefone('');
    setBusca('');
    setSucesso(false);
  };

  const addItem = (prod) => {
    setCarrinho(prev => {
      const exist = prev.find(p => p.id === prod.id);
      if (exist) {
        if (exist.quantidade >= prod.estoque) return prev;
        return prev.map(p => p.id === prod.id ? { ...p, quantidade: p.quantidade + 1 } : p);
      }
      return [...prev, { ...prod, quantidade: 1 }];
    });
  };

  const removeItem = (id) => {
    setCarrinho(prev => {
      const exist = prev.find(p => p.id === id);
      if (exist.quantidade === 1) return prev.filter(p => p.id !== id);
      return prev.map(p => p.id === id ? { ...p, quantidade: p.quantidade - 1 } : p);
    });
  };

  const total = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  const prodsFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));

  const handleFinalizar = async () => {
    if (carrinho.length === 0) return alert('Adicione produtos ao carrinho.');
    setLoading(true);
    try {
      await criarVendaPDV({
        clienteNome: clienteNome || 'Cliente Balcão',
        clienteTelefone: clienteTelefone || '00000000000',
        produtos: carrinho.map(c => ({ id: c.id, quantidade: c.quantidade })),
        pagamentos: [{ forma: formaPagamento, valor: total }]
      });
      setSucesso(true);
      setTimeout(() => {
        handleClose();
        // Disparar recarregamento geral se necessário
        window.dispatchEvent(new CustomEvent('venda-pdv-sucesso'));
      }, 2000);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao finalizar venda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={handleClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-gray-900 md:flex-row"
          >
            {/* Esquerda: Sele??o de Produtos */}
            <div className="w-full md:w-3/5 p-8 border-r border-gray-100 dark:border-white/5 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                 <div>
                   <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3">
                     <ShoppingBag className="w-8 h-8 text-emerald-500" /> Venda Rápida
                   </h2>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ponto de Venda (PDV)</p>
                 </div>
                 <button onClick={handleClose} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                   <X size={20} />
                 </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar produtos em estoque..." 
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 text-gray-900 dark:text-white font-medium transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[300px] pr-2 space-y-3 custom-scrollbar">
                {prodsFiltrados.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  prodsFiltrados.map(p => (
                    <motion.div 
                      key={p.id}
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-2xl group cursor-pointer hover:border-emerald-500/30 transition-colors"
                      onClick={() => addItem(p)}
                    >
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{p.nome}</h4>
                        <p className="text-xs text-gray-400">Estoque: {p.estoque}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-emerald-500 text-lg">R$ {p.preco.toFixed(2)}</span>
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <Plus size={16} />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Direita: Carrinho e Checkout */}
            <div className="w-full md:w-2/5 bg-gray-50 dark:bg-gray-900/50 p-8 flex flex-col">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Carrinho</h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 custom-scrollbar">
                {carrinho.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400 italic">
                    Carrinho vazio
                  </div>
                ) : (
                  carrinho.map(item => (
                    <div key={item.id} className="flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start">
                         <span className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">{item.nome}</span>
                         <span className="font-black text-emerald-500 text-sm whitespace-nowrap">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-1">
                          <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 shadow-sm"><Minus size={14} /></button>
                          <span className="text-xs font-bold text-gray-900 dark:text-white w-4 text-center">{item.quantidade}</span>
                          <button onClick={() => addItem(item)} className="w-6 h-6 rounded bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 shadow-sm"><Plus size={14} /></button>
                        </div>
                        <span className="text-[10px] text-gray-400">R$ {item.preco.toFixed(2)} /un</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/10 mt-auto">
                <div>
                  <input 
                    type="text" 
                    placeholder="Nome do Cliente (Opcional)" 
                    value={clienteNome}
                    onChange={e => setClienteNome(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm mb-2 outline-none focus:border-emerald-500 text-gray-900 dark:text-white"
                  />
                  <input 
                    type="text" 
                    placeholder="Telefone (Opcional)" 
                    value={clienteTelefone}
                    onChange={e => setClienteTelefone(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Forma de Pagamento</p>
                   <div className="grid grid-cols-3 gap-2">
                     {[
                       { id: 'pix', icon: Smartphone, label: 'PIX' },
                       { id: 'credito', icon: CreditCard, label: 'Crédito' },
                       { id: 'debito', icon: CreditCard, label: 'Débito' },
                       { id: 'dinheiro', icon: Banknote, label: 'Dinheiro' }
                     ].map(fp => (
                       <button 
                         key={fp.id}
                         onClick={() => setFormaPagamento(fp.id)}
                         className={cn(
                           "flex flex-col items-center justify-center p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest gap-2 transition-all",
                           formaPagamento === fp.id 
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-white/10 text-gray-500"
                         )}
                       >
                         <fp.icon size={16} /> {fp.label}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <span className="text-gray-400 text-sm font-medium">Total</span>
                  <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">R$ {total.toFixed(2)}</span>
                </div>

                {sucesso ? (
                  <div className="w-full py-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl">
                    <CheckCircle size={20} /> Venda Concluída!
                  </div>
                ) : (
                  <button 
                    onClick={handleFinalizar}
                    disabled={loading || carrinho.length === 0}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loading ? 'Processando...' : 'Finalizar Venda'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
