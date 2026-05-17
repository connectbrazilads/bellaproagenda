import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import { getRespostasRapidas, createRespostaRapida, deleteRespostaRapida } from '../services/api';

export default function SnippetsConfig() {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ atalho: '', texto: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadSnippets();
  }, []);

  async function loadSnippets() {
    setLoading(true);
    try {
      const response = await getRespostasRapidas();
      setSnippets(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.atalho || !form.texto) return;

    try {
      await createRespostaRapida({ atalho: form.atalho, texto: form.texto });
      setForm({ atalho: '', texto: '' });
      await loadSnippets();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar resposta rápida.');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Deseja excluir esta resposta rápida?')) return;
    try {
      await deleteRespostaRapida(id);
      setSnippets(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f] p-4 sm:p-8">
        <p className="brand-kicker">Automação de Atendimento</p>
        <h3 className="mt-2 text-3xl font-brand-display text-gray-900 dark:text-white">Respostas Rápidas</h3>
        <p className="mt-3 text-sm text-gray-600 dark:text-white/60 max-w-2xl">
          Crie atalhos para agilizar o atendimento da equipe. Basta digitar <code className="text-[#e29ba8] bg-[#e29ba8]/10 px-1.5 py-0.5 rounded">/</code> no Inbox para visualizar a lista.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col md:flex-row gap-4 items-end bg-gray-50 dark:bg-black/20 p-5 rounded-[1.5rem] border border-gray-200 dark:border-white/5">
          <div className="w-full md:w-1/4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">Atalho</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">/</span>
              <input
                type="text"
                value={form.atalho}
                onChange={e => setForm(prev => ({ ...prev, atalho: e.target.value.replace('/', '').trim() }))}
                placeholder="ex: pix"
                className="w-full rounded-[1.2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#332832] px-4 py-3 pl-8 text-sm text-gray-900 dark:text-white outline-none focus:border-[#e29ba8]/28"
                required
              />
            </div>
          </div>
          <div className="w-full md:w-2/4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 dark:text-white/40">Texto Completo</label>
            <input
              type="text"
              value={form.texto}
              onChange={e => setForm(prev => ({ ...prev, texto: e.target.value }))}
              placeholder="Digite o texto completo aqui..."
              className="w-full rounded-[1.2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#332832] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#e29ba8]/28"
              required
            />
          </div>
          <div className="w-full md:w-1/4">
            <button
              type="submit"
              className="w-full rounded-[1.2rem] bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] shadow-lg flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-3 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14}/> {error}</p>
        )}

        <div className="mt-8 space-y-3">
          {loading ? (
             <div className="text-center text-sm text-gray-400 py-4">Carregando respostas rápidas...</div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-[1.5rem] bg-gray-50/50 dark:bg-transparent">
              <MessageSquare size={32} className="text-gray-300 dark:text-white/10 mb-4" />
              <p className="text-sm font-bold text-gray-500 dark:text-white/50">Nenhum atalho criado</p>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-1">Crie seu primeiro atalho acima para agilizar o inbox.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {snippets.map((snippet) => (
                <motion.div
                  key={snippet.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 rounded-[1.5rem] border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] hover:border-[#e29ba8]/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[#e29ba8]/10 text-[#d48997] font-black tracking-widest text-[10px] px-3 py-1.5 rounded-lg border border-[#e29ba8]/20">
                      /{snippet.atalho}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">{snippet.texto}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(snippet.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
