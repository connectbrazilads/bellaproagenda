import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Trash2, Clock, Plus, ShieldAlert, CalendarDays } from 'lucide-react';
import { getBloqueios, createBloqueio, deleteBloqueio, getProfissionais } from '../../services/api';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const FORM_INICIAL = {
  profissionalId: '',
  data: '',
  tipo: 'dia_todo',
  inicioHora: '',
  fimHora: '',
  motivo: '',
};

export default function Bloqueios() {
  const role = localStorage.getItem('salao_user_role');
  const myProfissionalId = localStorage.getItem('salao_user_pid') || '';
  const isScopedProfessional = role === 'profissional' && !!myProfissionalId;
  const [bloqueios, setBloqueios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...FORM_INICIAL, profissionalId: myProfissionalId });
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

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    if (!form.profissionalId || !form.data) return;

    if (form.tipo === 'periodo') {
      if (!form.inicioHora || !form.fimHora) {
        alert('Informe inicio e fim para bloquear um periodo.');
        return;
      }
      if (form.fimHora <= form.inicioHora) {
        alert('O horario final precisa ser maior que o horario inicial.');
        return;
      }
    }

    setSaving(true);
    try {
      await createBloqueio({
        profissionalId: isScopedProfessional ? myProfissionalId : form.profissionalId,
        data: form.data,
        inicioHora: form.tipo === 'periodo' ? form.inicioHora : null,
        fimHora: form.tipo === 'periodo' ? form.fimHora : null,
        motivo: form.motivo || null,
      });
      setForm({ ...FORM_INICIAL, profissionalId: myProfissionalId });
      setShowForm(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Nao foi possivel salvar o bloqueio.');
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
      className="mx-auto max-w-4xl space-y-12 pb-20"
    >
      <header className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-10 md:flex-row md:items-center md:p-8 dark:border-white/5">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Lock className="h-4 w-4 animate-pulse text-orange-500" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500">Restricoes de Agenda</h2>
          </div>
          <h1 className="mb-4 text-2xl font-black leading-none tracking-tighter text-gray-900 sm:text-4xl sm:text-6xl dark:text-white">
            Seus <span className="text-orange-500">Bloqueios</span>
          </h1>
          <p className="max-w-xl text-xl font-medium leading-relaxed text-gray-400">
            Gerencie horarios indisponiveis e folgas da sua equipe com mais clareza.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm((valorAtual) => !valorAtual)}
          className="flex items-center gap-3 rounded-[2rem] bg-orange-500 px-10 py-5 text-xs font-black uppercase tracking-widest text-gray-900 shadow-2xl shadow-orange-500/20 dark:text-white"
        >
          <Plus className="h-4 w-4" /> NOVO BLOQUEIO
        </motion.button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={salvar}
            className="overflow-hidden rounded-[2rem] border-2 border-orange-100 bg-white p-5 shadow-2xl shadow-orange-500/5 backdrop-blur-3xl md:p-10 dark:border-orange-900/20 dark:bg-gray-900/40"
          >
            <h2 className="mb-8 text-2xl font-black tracking-tighter text-gray-900 dark:text-white">Bloquear Agenda</h2>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:p-6 md:grid-cols-2">
              <div className="space-y-1">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Profissional</label>
                {isScopedProfessional ? (
                  <input
                    value={profissionais.find((p) => p.id === myProfissionalId)?.nome || 'Seu perfil'}
                    readOnly
                    className="w-full rounded-2xl border-2 border-transparent bg-gray-100 px-6 py-4 font-black text-gray-900 outline-none dark:bg-white/10 dark:text-white"
                  />
                ) : (
                  <select
                    value={form.profissionalId}
                    onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
                    className="w-full appearance-none rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-black text-gray-900 outline-none focus:border-orange-500 dark:bg-white/5 dark:text-white"
                    required
                  >
                    <option value="">Selecionar profissional...</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-black text-gray-900 outline-none focus:border-orange-500 dark:bg-white/5 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de bloqueio</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo: 'dia_todo', inicioHora: '', fimHora: '' })}
                    className={`rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                      form.tipo === 'dia_todo'
                        ? 'border-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-500/10 dark:text-white'
                        : 'border-gray-100 bg-gray-50 text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-white/66'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase tracking-widest">Dia inteiro</span>
                    <span className="mt-1 block text-xs font-semibold opacity-70">
                      Bloqueia toda a agenda do profissional nessa data.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo: 'periodo' })}
                    className={`rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                      form.tipo === 'periodo'
                        ? 'border-orange-500 bg-orange-50 text-gray-900 dark:bg-orange-500/10 dark:text-white'
                        : 'border-gray-100 bg-gray-50 text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-white/66'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase tracking-widest">Periodo</span>
                    <span className="mt-1 block text-xs font-semibold opacity-70">
                      Bloqueia apenas um intervalo especifico de horario.
                    </span>
                  </button>
                </div>
              </div>

              {form.tipo === 'periodo' && (
                <>
                  <div className="space-y-1">
                    <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Inicio</label>
                    <input
                      type="time"
                      value={form.inicioHora}
                      onChange={(e) => setForm({ ...form, inicioHora: e.target.value })}
                      className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-black text-gray-900 outline-none focus:border-orange-500 dark:bg-white/5 dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Fim</label>
                    <input
                      type="time"
                      value={form.fimHora}
                      onChange={(e) => setForm({ ...form, fimHora: e.target.value })}
                      className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-black text-gray-900 outline-none focus:border-orange-500 dark:bg-white/5 dark:text-white"
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-1 md:col-span-2">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Motivo / Observacao</label>
                <input
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ex: Folga, feriado, consulta medica..."
                  className="w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 font-black text-gray-900 outline-none focus:border-orange-500 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-2xl border-2 border-gray-100 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all hover:bg-gray-50 dark:border-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-orange-500 py-5 text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-xl shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:opacity-50 dark:text-white"
              >
                {saving ? 'PROCESSANDO...' : 'CONFIRMAR BLOQUEIO'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="py-40 text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        ) : bloqueios.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-gray-100 bg-gray-50 p-32 text-center dark:border-white/5 dark:bg-white/5">
            <ShieldAlert className="mx-auto mb-8 h-16 w-16 text-gray-200 dark:text-gray-800" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 dark:text-gray-700">
              Agenda 100% livre de bloqueios
            </p>
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
                  className="group flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-gray-100 bg-white p-4 shadow-xl shadow-gray-100/30 backdrop-blur-3xl transition-all hover:border-orange-200 md:flex-row md:p-8 dark:border-white/5 dark:bg-gray-900/40 dark:shadow-none dark:hover:border-orange-900/30"
                >
                  <div className="flex w-full items-center gap-4 md:w-auto md:p-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-orange-100 bg-orange-50 dark:border-orange-800/30 dark:bg-orange-900/20">
                      <Clock className="h-10 w-10 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="mb-2 text-2xl font-black uppercase leading-none tracking-tighter text-gray-900 dark:text-white">
                        {b.profissional?.nome}
                      </h4>
                      <div className="flex items-center gap-4">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-gray-500">
                          <CalendarDays size={14} className="text-orange-500" />
                          {formatarData(b.data)}
                        </p>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                          {b.inicioHora && b.fimHora ? `${b.inicioHora} - ${b.fimHora}` : 'Dia inteiro'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-5 border-t border-gray-50 pt-6 md:w-auto md:justify-end md:border-t-0 md:pt-0 md:p-10 dark:border-white/5">
                    <div className="text-right">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-gray-400">Motivo</p>
                      <p className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                        {b.motivo || 'Nao especificado'}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => excluir(b.id)}
                      className="rounded-2xl bg-orange-50 p-4 text-orange-400 transition-all hover:text-red-500 dark:bg-orange-500/10"
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
