import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Trash2, Clock, Plus, ShieldAlert, CalendarDays, X } from 'lucide-react';
import { getBloqueios, createBloqueio, deleteBloqueio, getProfissionais } from '../../services/api';
import { cn } from '../../lib/utils';

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
        alert('Informe início e fim para bloquear um período.');
        return;
      }
      if (form.fimHora <= form.inicioHora) {
        alert('O horário final precisa ser maior que o horário inicial.');
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
      alert(err.response?.data?.error || 'Não foi possível salvar o bloqueio.');
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-8 pb-20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col items-start justify-between gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Lock className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Restrições de Agenda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Gestão de <span className="text-[#d48997]">Bloqueios</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Gerencie horários indisponíveis e folgas da sua equipe com mais clareza.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Novo Bloqueio
        </motion.button>
      </header>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={salvar}
            className="overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 md:p-8 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6 border-b border-black/[0.03] dark:border-white/5 pb-4">
              <div>
                <p className="text-[10px] font-semibold text-[#d48997]">Nova restrição</p>
                <h2 className="mt-1 font-serif font-normal text-xl text-gray-905 dark:text-white">Bloquear Agenda</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Profissional</span>
                {isScopedProfessional ? (
                  <input
                    value={profissionais.find((p) => p.id === myProfissionalId)?.nome || 'Seu perfil'}
                    readOnly
                    className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none dark:bg-[#111113] dark:text-white"
                  />
                ) : (
                  <select
                    value={form.profissionalId}
                    onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
                    className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                    required
                  >
                    <option value="">Selecionar profissional...</option>
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Data</span>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-2.5">
                <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">Tipo de bloqueio</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo: 'dia_todo', inicioHora: '', fimHora: '' })}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      form.tipo === 'dia_todo'
                        ? 'border-[#d48997] bg-[#d48997]/10 text-gray-900 dark:text-white'
                        : 'border-black/[0.04] bg-gray-50/50 text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-white/70'
                    )}
                  >
                    <span className="block text-xs font-semibold">Dia inteiro</span>
                    <span className="mt-1 block text-[10px] font-medium opacity-70">
                      Bloqueia toda a agenda do profissional nessa data.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo: 'periodo' })}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-all',
                      form.tipo === 'periodo'
                        ? 'border-[#d48997] bg-[#d48997]/10 text-gray-900 dark:text-white'
                        : 'border-black/[0.04] bg-gray-50/50 text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-white/70'
                    )}
                  >
                    <span className="block text-xs font-semibold">Período</span>
                    <span className="mt-1 block text-[10px] font-medium opacity-70">
                      Bloqueia apenas um intervalo específico de horário.
                    </span>
                  </button>
                </div>
              </div>

              {form.tipo === 'periodo' && (
                <>
                  <div>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Início</span>
                    <input
                      type="time"
                      value={form.inicioHora}
                      onChange={(e) => setForm({ ...form, inicioHora: e.target.value })}
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                      required
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Fim</span>
                    <input
                      type="time"
                      value={form.fimHora}
                      onChange={(e) => setForm({ ...form, fimHora: e.target.value })}
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all"
                      required
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Motivo / Observação</span>
                <input
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ex: Folga, feriado, consulta médica..."
                  className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 dark:bg-[#111113] dark:text-white transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="inline-flex items-center justify-center rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:text-white px-5 py-2.5 text-xs font-semibold text-gray-500 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-70"
              >
                {saving ? 'Processando...' : 'Confirmar Bloqueio'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex min-h-[35vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-[#d48997]" />
          </div>
        ) : bloqueios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.06] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] px-8 py-16 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 font-serif font-normal text-xl text-gray-905 dark:text-white">Agenda livre de bloqueios</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-400 dark:text-gray-500">
              Nenhum bloqueio registrado. Crie restrições de horário para organizar folgas e indisponibilidades.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence>
              {bloqueios.map((b, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={b.id}
                  className="group flex flex-col items-start justify-between gap-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 shadow-sm transition-all hover:border-[#e29ba8]/30 dark:hover:border-[#e29ba8]/20 md:flex-row md:items-center"
                >
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997] border border-[#d48997]/20 shrink-0">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-base text-gray-900 dark:text-white leading-tight truncate normal-case">
                        {b.profissional?.nome}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <CalendarDays size={14} className="text-[#d48997]" />
                          {formatarData(b.data)}
                        </span>
                        <span className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[9px] font-semibold tracking-wide",
                          b.inicioHora && b.fimHora
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        )}>
                          {b.inicioHora && b.fimHora ? `${b.inicioHora} – ${b.fimHora}` : 'Dia inteiro'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-4 border-t border-black/[0.03] pt-4 md:w-auto md:justify-end md:border-t-0 md:pt-0 dark:border-white/5">
                    <div className="text-right min-w-0">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Motivo</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                        {b.motivo || 'Não especificado'}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => excluir(b.id)}
                      className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 text-gray-400 transition-all hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 size={16} />
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
