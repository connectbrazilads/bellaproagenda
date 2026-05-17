import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Edit3, Package, Plus, Trash2 } from 'lucide-react';
import {
  createPacote,
  deletePacote,
  getPacotes,
  getServicos,
  updatePacote,
} from '../../services/api';

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
      servicosIds: pacote.itens?.map((item) => item.servicoId).filter(Boolean) || [],
    });
    setModalOpen(true);
  }

  async function excluirPacote(id) {
    if (!window.confirm('Excluir este pacote?')) return;
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
    <div className="mx-auto flex max-w-7xl flex-col gap-4 md:p-8 pb-16">
      <section className="flex flex-col gap-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#E29BA8]">
            <Package className="h-4 w-4" />
            Combos de valor
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Pacotes <span className="text-[#E29BA8]">BellaPro</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Monte ofertas mais fortes combinando servicos, narrativa comercial e previsibilidade de receita.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirNovo}
          className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          Novo pacote
        </button>
      </section>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[rgba(233,155,168,0.22)] border-t-[#e99ba8]" />
        </div>
      ) : pacotes.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(233,155,168,0.16)] bg-[rgba(41,31,37,0.82)] px-8 py-16 text-center">
          <Package className="mx-auto h-14 w-14 text-[#806871]" />
          <h2 className="mt-6 font-['Playfair_Display'] text-3xl text-[#faf7f6]">Nenhum pacote cadastrado</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#c7adb4]">
            Comece criando combos estrategicos para aumentar ticket medio e dar mais clareza comercial ao seu menu.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          {pacotes.map((pacote) => (
            <article
              key={pacote.id}
              className="flex flex-col rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editarPacote(pacote)}
                    className="rounded-2xl border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-3 text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#f7c1b6]"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirPacote(pacote.id)}
                    className="rounded-2xl border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] p-3 text-[#c7adb4] transition hover:border-[rgba(220,120,120,0.22)] hover:text-[#f4aaaa]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">{pacote.nome}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#c7adb4]">
                {pacote.descricao || 'Pacote pronto para combinar conveniencia, resultado e recorrencia.'}
              </p>

              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#E29BA8]">
                  Servicos inclusos
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(pacote.itens || []).length ? (
                    pacote.itens.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d7c0c6]"
                      >
                        {item.servico?.nome || 'Servico'}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#8f7880]">Nenhum servico associado.</span>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-end justify-between border-t border-gray-200 dark:border-white/5 pt-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9f848d]">
                    Valor
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[#f7c1b6]">{moeda(pacote.preco)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9f848d]">
                    Validade
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#faf7f6]">
                    {pacote.validadeDias || 0} dias
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen ? (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              onSubmit={salvar}
              className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.98)] p-4 sm:p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:p-8"
            >
              <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 dark:border-white/5 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E29BA8]">
                    Estrutura comercial
                  </p>
                  <h2 className="mt-3 font-['Playfair_Display'] text-2xl sm:text-4xl text-[#faf7f6]">
                    {editing ? 'Editar pacote' : 'Novo pacote'}
                  </h2>
                </div>
                <div className="text-sm leading-7 text-[#c7adb4] sm:max-w-sm">
                  Escolha os servicos que entram no combo e defina um valor que faça sentido para a sua margem.
                </div>
              </div>

              <div className="grid gap-4 sm:p-6 lg:grid-cols-[minmax(0,1fr),320px]">
                <div className="space-y-5">
                  <label className="block space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                      Nome do pacote
                    </span>
                    <input
                      value={form.nome}
                      onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                      required
                      className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                      placeholder="Ex.: Ritual glow premium"
                    />
                  </label>

                  <label className="block space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                      Descricao
                    </span>
                    <textarea
                      value={form.descricao}
                      onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                      rows={5}
                      className="w-full rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 py-4 text-base leading-7 text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                      placeholder="Descreva o posicionamento e os beneficios percebidos pela cliente."
                    />
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block space-y-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                        Preco
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.preco}
                        onChange={(e) => setForm((prev) => ({ ...prev, preco: e.target.value }))}
                        required
                        className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                      />
                    </label>

                    <label className="block space-y-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">
                        Validade em dias
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
                        className="h-14 w-full rounded-[20px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-[28px] border border-gray-200 dark:border-white/5 bg-[rgba(41,31,37,0.76)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#E29BA8]">
                    Servicos do pacote
                  </p>
                  <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {servicos.map((servico) => {
                      const active = form.servicosIds.includes(servico.id);
                      return (
                        <button
                          key={servico.id}
                          type="button"
                          onClick={() => toggleServico(servico.id)}
                          className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition ${
                            active
                              ? 'border-[rgba(233,155,168,0.28)] bg-[rgba(233,155,168,0.12)] text-[#faf7f6]'
                              : 'border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.03)] text-[#c7adb4] hover:border-[rgba(233,155,168,0.18)]'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold">{servico.nome}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8f7880]">
                              {moeda(servico.preco)}
                            </p>
                          </div>
                          {active ? <Check className="h-4 w-4 text-[#f7c1b6]" /> : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-[22px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.54)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9f848d]">
                      Selecionados
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {resumoServicos.length ? (
                        resumoServicos.map((nome) => (
                          <span
                            key={nome}
                            className="rounded-full border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7c0c6]"
                          >
                            {nome}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[#8f7880]">Nenhum servico selecionado.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-gray-200 dark:border-white/5 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : editing ? 'Atualizar pacote' : 'Criar pacote'}
                </button>
              </div>
            </motion.form>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
