import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Trash2, 
  Calendar, 
  Clock, 
  Plus, 
  User,
  ShieldAlert,
  CalendarDays
} from 'lucide-react';
import { getBloqueios, createBloqueio, deleteBloqueio, getProfissionais } from '../../services/api';
import { cn } from '../../lib/utils';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Bloqueios() {
  const role = localStorage.getItem('salao_user_role');
  const myProfissionalId = localStorage.getItem('salao_user_pid') || '';
  const isScopedProfessional = role === 'profissional' && !!myProfissionalId;
  const [bloqueios, setBloqueios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    profissionalId: myProfissionalId,
    data: '',
    inicioHora: '',
    fimHora: '',
    motivo: '',
  });
  const [saving, setSaving] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [rb, rp] = await Promise.all([getBloqueios(), getProfissionais()]);
      setBloqueios(rb.data || []);
      setProfissionais(rp.data?.filter((p) => p.ativo) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    if (!form.profissionalId || !form.data) return;
    setSaving(true);
    try {
      await createBloqueio({
        profissionalId: isScopedProfessional ? myProfissionalId : form.profissionalId,
        data: form.data,
        inicioHora: form.inicioHora || null,
        fimHora: form.fimHora || null,
        motivo: form.motivo || null,
      });
      setForm({ profissionalId: myProfissionalId, data: '', inicioHora: '', fimHora: '', motivo: '' });
      setShowForm(false);
      carregar();
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id) {
    if (!confirm('Remover este bloqueio?')) return;
    await deleteBloqueio(id);
    carregar();
  }

  function formatarData(dataISO) {
    const d = new Date(dataISO);
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const ano = d.getUTCFullYear();
    const diaSem = DIAS[d.getUTCDay()];
    return `${diaSem}, ${dia}/${mes}/${ano}`;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:p-8 border-b border-gray-100 dark:border-white/5 pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-4 h-4 text-orange-500 animate-pulse" />
            <h2 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">Restrições de Agenda</h2>
          </div>
          <h1 className="text-2xl sm:text-4xl sm:text-6xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-4">Seus <span className="text-orange-500">Bloqueios</span></h1>
          <p className="text-gray-400 font-medium text-xl max-w-xl leading-relaxed">Gerencie horários indisponíveis e folgas da sua equipe com precisão.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-gray-900 dark:text-white px-10 py-5 rounded-[2rem] font-black text-xs shadow-2xl shadow-orange-500/20 flex items-center gap-3 uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> NOVO BLOQUEIO
        </motion.button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={salvar} 
            className="bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[2rem] border-2 border-orange-100 dark:border-orange-900/20 p-5 md:p-10 overflow-hidden shadow-2xl shadow-orange-500/5"
          >
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tighter">Bloquear Período</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6 mb-8">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Profissional</label>
                {isScopedProfessional ? (
                  <input
                    value={profissionais[0]?.nome || 'Seu perfil'}
                    readOnly
                    className="w-full bg-gray-100 dark:bg-white/10 border-2 border-transparent rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none"
                  />
                ) : (
                  <select
                    value={form.profissionalId}
                    onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none appearance-none"
                    required
                  >
                    <option value="">Selecionar Artista...</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Início (vazio = dia todo)</label>
                <input
                  type="time"
                  value={form.inicioHora}
                  onChange={(e) => setForm({ ...form, inicioHora: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Fim</label>
                <input
                  type="time"
                  value={form.fimHora}
                  onChange={(e) => setForm({ ...form, fimHora: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Motivo / Observação</label>
                <input
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ex: Folga, Feriado, Consulta Médica..."
                  className="w-full bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-2xl border-2 border-gray-100 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-5 bg-orange-500 text-gray-900 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50">
                {saving ? 'PROCESSANDO...' : 'CONFIRMAR BLOQUEIO'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="py-40 text-center">
            <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : bloqueios.length === 0 ? (
          <div className="bg-gray-50 dark:bg-white/5 rounded-[3rem] p-32 text-center border-2 border-dashed border-gray-100 dark:border-white/5">
             <ShieldAlert className="w-16 h-16 text-gray-200 dark:text-gray-800 mx-auto mb-8" />
             <p className="text-gray-300 dark:text-gray-700 font-black uppercase tracking-[0.3em] text-[10px]">Agenda 100% Livre de Bloqueios</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {bloqueios.map((b, idx) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={b.id} 
                  className="bg-white dark:bg-gray-900/40 backdrop-blur-3xl rounded-[2rem] border border-gray-100 dark:border-white/5 p-4 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:p-8 group hover:border-orange-200 dark:hover:border-orange-900/30 transition-all shadow-xl shadow-gray-100/30 dark:shadow-none"
                >
                  <div className="flex items-center gap-4 md:p-8 w-full md:w-auto">
                    <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-[1.5rem] flex items-center justify-center border border-orange-100 dark:border-orange-800/30">
                      <Clock className="w-10 h-10 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-2">{b.profissional?.nome}</h4>
                      <div className="flex items-center gap-4">
                        <p className="text-xs text-gray-500 font-bold flex items-center gap-2 uppercase tracking-tight">
                          <CalendarDays size={14} className="text-orange-500" />
                          {formatarData(b.data)}
                        </p>
                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest">
                          {b.inicioHora && b.fimHora ? `${b.inicioHora} — ${b.fimHora}` : 'Dia Inteiro'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-5 md:p-10 w-full md:w-auto border-t md:border-t-0 border-gray-50 dark:border-white/5 pt-6 md:pt-0">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Motivo</p>
                       <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{b.motivo || 'NÃNão especificado'}</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => excluir(b.id)}
                      className="p-4 bg-orange-50 dark:bg-orange-500/10 text-orange-400 hover:text-red-500 rounded-2xl transition-all"
                    >
                      <Trash2 size={20} />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
