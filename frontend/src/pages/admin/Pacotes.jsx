import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Clock,
  DollarSign,
  Edit3,
  Package,
  Plus,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  createPacote,
  deletePacote,
  getPacotes,
  getServicos,
  updatePacote,
} from '../../services/api';
import { cn } from '../../lib/utils';

const EMPTY_FORM = {
  nome: '',
  descricao: '',
  preco: '',
  validadeDias: 30,
  servicosIds: [],
};

function moeda(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function Pacotes() {
  const [pacotes, setPacotes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setLoading(true);
    try {
      const [pacotesResponse, servicosResponse] = await Promise.all([getPacotes(), getServicos()]);
      setPacotes(pacotesResponse?.data || []);
      setServicos(servicosResponse?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    return pacotes.filter(
      (p) =>
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao?.toLowerCase().includes(busca.toLowerCase())
    );
  }, [pacotes, busca]);

  const resumoServicos = useMemo(() => {
    const mapa = new Map(servicos.map((servico) => [servico.id, servico.nome]));
    return form.servicosIds.map((id) => mapa.get(id)).filter(Boolean);
  }, [form.servicosIds, servicos]);

  function abrirNovo() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function editarPacote(pacote) {
    setEditing(pacote);
    setForm({
      nome: pacote.nome || '',
      descricao: pacote.descricao || '',
      preco: pacote.preco || '',
      validadeDias: pacote.validadeDias || 30,
      servicosIds: pacote.servicos?.map((item) => item.servicoId).filter(Boolean) || [],
    });
    setModalOpen(true);
  }

  async function excluirPacote(id) {
    if (!window.confirm('Deseja realmente excluir este pacote?')) return;
    await deletePacote(id);
    await carregar();
  }

  function toggleServico(id) {
    setForm((prev) => ({
      ...prev,
      servicosIds: prev.servicosIds.includes(id)
        ? prev.servicosIds.filter((servicoId) => servicoId !== id)
        : [...prev.servicosIds, id],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        preco: Number(form.preco || 0),
        validadeDias: Number(form.validadeDias || 0),
      };

      if (editing) {
        await updatePacote(editing.id, payload);
      } else {
        await createPacote(payload);
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-8 pb-20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Package className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Combos Promocionais</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Gestão de <span className="text-[#d48997]">Pacotes</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Crie ofertas exclusivas combinando múltiplos serviços com condições especiais e prazos de validade flexíveis.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pacote..."
              className="h-11 w-full min-w-[240px] rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={abrirNovo}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            <Plus className="h-4 w-4" /> Novo pacote
          </motion.button>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.01] px-8 py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
          <h2 className="mt-4 font-serif text-lg text-gray-800 dark:text-gray-200">Nenhum pacote encontrado</h2>
          <p className="mx-auto mt-2 max-w-xs text-xs text-gray-400 dark:text-gray-500">
            Experimente buscar por outro termo ou crie um novo pacote clicando no botão acima.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtrados.map((pacote) => (
              <motion.article
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={pacote.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm transition-all hover:shadow-md hover:border-black/[0.08] dark:hover:border-white/[0.08]"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997]">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => editarPacote(pacote)}
                        className="rounded-lg border border-black/[0.04] dark:border-white/10 bg-white/80 dark:bg-[#18181b]/80 p-2 text-gray-400 hover:text-[#d48997] transition shadow-sm"
                        title="Editar"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => excluirPacote(pacote.id)}
                        className="rounded-lg border border-black/[0.04] dark:border-white/10 bg-white/80 dark:bg-[#18181b]/80 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif text-lg font-medium text-gray-900 dark:text-white group-hover:text-[#d48997] transition-colors">
                    {pacote.nome}
                  </h3>
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">
                    {pacote.descricao || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="mt-4 border-t border-dashed border-black/[0.04] dark:border-white/[0.04] pt-4">
                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">
                      Serviços inclusos
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto pr-1">
                      {(pacote.servicos || []).length > 0 ? (
                        pacote.servicos.map((item) => (
                          <span
                            key={item.servicoId}
                            className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/5 px-2 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-300"
                          >
                            {item.servico?.nome || 'Serviço'}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Nenhum serviço associado.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-black/[0.03] dark:border-white/5 pt-4 flex items-end justify-between">
                  <div>
                    <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                      Preço
                    </span>
                    <span className="text-xl font-semibold text-gray-900 dark:text-white">
                      {moeda(pacote.preco)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                      Validade
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <Clock className="h-3.5 w-3.5 text-[#d48997]" />
                      {pacote.validadeDias || 0} dias
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#18181b] shadow-xl"
            >
              <form onSubmit={salvar} className="flex flex-col max-h-[85dvh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 px-6 py-4">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">
                      Formulário de Pacote
                    </span>
                    <h2 className="mt-0.5 font-serif text-lg font-normal text-gray-900 dark:text-white">
                      {editing ? 'Editar Pacote' : 'Novo Pacote'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto px-6 py-6 space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-4 md:col-span-2">
                      <div>
                        <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                          Nome do Pacote
                        </span>
                        <input
                          value={form.nome}
                          onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                          required
                          className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
                          placeholder="Ex: Combo Noiva Bronze, Pacote Massoterapia..."
                        />
                      </div>

                      <div>
                        <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                          Descrição
                        </span>
                        <textarea
                          value={form.descricao}
                          onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                          rows={3}
                          className="w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400 resize-none"
                          placeholder="Descreva detalhes ou termos especiais do pacote..."
                        />
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        Preço de Venda (R$)
                      </span>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.preco}
                          onChange={(e) => setForm((prev) => ({ ...prev, preco: e.target.value }))}
                          required
                          className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-9 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        Validade (dias)
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={form.validadeDias}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            validadeDias: Number(e.target.value || 0),
                          }))
                        }
                        required
                        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="border-t border-black/[0.04] dark:border-white/5 pt-5">
                    <span className="mb-3 block text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      Vincular Serviços ao Pacote
                    </span>

                    <div className="grid gap-2.5 sm:grid-cols-2 max-h-[180px] overflow-y-auto pr-1">
                      {servicos.map((servico) => {
                        const active = form.servicosIds.includes(servico.id);
                        return (
                          <button
                            key={servico.id}
                            type="button"
                            onClick={() => toggleServico(servico.id)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all',
                              active
                                ? 'border-[#d48997] bg-[#d48997]/5 text-gray-900 dark:text-white'
                                : 'border-black/[0.06] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] hover:border-black/[0.12] dark:hover:border-white/[0.12]'
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">
                                {servico.nome}
                              </p>
                              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                                {moeda(servico.preco)}
                              </p>
                            </div>
                            <div
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-md border transition-all',
                                active
                                  ? 'border-[#d48997] bg-[#d48997] text-white'
                                  : 'border-black/20 dark:border-white/20 bg-white dark:bg-transparent'
                              )}
                            >
                              {active && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-10 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] px-5 text-xs font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Pacote'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
