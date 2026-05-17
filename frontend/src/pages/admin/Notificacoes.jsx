import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  Eye,
  Info,
  MessageSquare,
  Save,
  Type,
  Zap,
} from 'lucide-react';
import { getAdminSalao, updateAdminSalao } from '../../services/api';

const TEMPLATE_SECTIONS = [
  {
    key: 'templateConfirmacao',
    titulo: 'Confirmacao',
    descricao: 'Enviado logo apos a reserva ser registrada.',
    icon: CheckCircle2,
  },
  {
    key: 'templateLembrete',
    titulo: 'Lembrete 24h',
    descricao: 'Reforca a presenca da cliente no dia anterior.',
    icon: Bell,
  },
  {
    key: 'templateCancelamento',
    titulo: 'Cancelamento',
    descricao: 'Padroniza a comunicacao quando houver desistencias.',
    icon: Zap,
  },
];

const TAGS = ['cliente', 'servico', 'profissional', 'data', 'hora', 'salao'];

function renderPreview(template, salaoNome) {
  if (!template) return '';

  return template
    .replace(/{{cliente}}/g, 'Camila')
    .replace(/{{servico}}/g, 'Escova modelada')
    .replace(/{{profissional}}/g, 'Ana Silva')
    .replace(/{{data}}/g, '16/05/2026')
    .replace(/{{hora}}/g, '14:30')
    .replace(/{{salao}}/g, salaoNome || 'BellaPro Agenda');
}

function Bubble({ text, tone = 'left' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex max-w-[85%] flex-col ${tone === 'left' ? 'self-start' : 'self-end'}`}
    >
      <div
        className={`rounded-[22px] px-4 py-3 text-sm leading-6 shadow-lg ${
          tone === 'left'
            ? 'rounded-tl-md bg-[#202c33] text-white'
            : 'rounded-tr-md bg-[#005c4b] text-white'
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-gray-200 dark:text-white/55">
          <span>14:31</span>
          <span>OK</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Notificacoes() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salaoNome, setSalaoNome] = useState('');
  const [form, setForm] = useState({
    templateConfirmacao: '',
    templateLembrete: '',
    templateCancelamento: '',
  });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const response = await getAdminSalao();
        const salao = response?.data || response;
        if (!ativo) return;

        setSalaoNome(salao?.nome || '');
        setForm({
          templateConfirmacao: salao?.templateConfirmacao || '',
          templateLembrete: salao?.templateLembrete || '',
          templateCancelamento: salao?.templateCancelamento || '',
        });
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const previews = useMemo(
    () =>
      TEMPLATE_SECTIONS.map((section) => ({
        ...section,
        text: renderPreview(form[section.key], salaoNome),
      })).filter((section) => section.text),
    [form, salaoNome]
  );

  async function salvar() {
    setSalvando(true);
    try {
      await updateAdminSalao(form);
      window.alert('Templates salvos com sucesso.');
    } catch {
      window.alert('Nao foi possivel salvar os templates agora.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[rgba(233,155,168,0.22)] border-t-[#e99ba8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 md:p-8 pb-16">
      <section className="flex flex-col gap-4 sm:p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#16141a]/95 p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#E29BA8]">
            <MessageSquare className="h-4 w-4" />
            Voz da marca
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-2xl sm:text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Templates de <span className="text-[#E29BA8]">WhatsApp</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Personalize confirmacoes, lembretes e cancelamentos com a linguagem elegante da BellaPro e um preview fiel da mensagem final.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#E29BA8] to-[#d48997] text-[#111116] px-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar templates'}
        </button>
      </section>

      <section className="grid gap-4 sm:p-6 xl:grid-cols-[minmax(0,1fr),390px]">
        <div className="space-y-5">
          {TEMPLATE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.key}
                className="rounded-[2rem] border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
              >
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-['Playfair_Display'] text-2xl text-[#faf7f6]">
                      {section.titulo}
                    </h2>
                    <p className="mt-1 text-sm text-[#c7adb4]">{section.descricao}</p>
                  </div>
                </div>

                <textarea
                  value={form[section.key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [section.key]: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Escreva a mensagem principal e use as variaveis dinamicas abaixo."
                  className="w-full resize-none rounded-[24px] border border-gray-200 dark:border-white/5 bg-[rgba(20,16,22,0.66)] px-5 py-4 text-base leading-7 text-[#faf7f6] outline-none placeholder:text-[#806871] focus:border-[rgba(233,155,168,0.28)]"
                />
              </div>
            );
          })}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 sm:p-6 xl:self-start">
          <div className="inline-flex items-center gap-3 rounded-full border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1a171f]/95 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c7adb4]">
            <Eye className="h-4 w-4 text-[#f7c1b6]" />
            Preview em tempo real
          </div>

          <div className="overflow-hidden rounded-[36px] border border-gray-200 dark:border-white/5 bg-[#0f191f] shadow-[0_32px_90px_rgba(0,0,0,0.35)]">
            <div className="border-b border-gray-200 dark:border-white/5 bg-[#111b21] px-6 py-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">BellaPro Agenda</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                Simulacao do WhatsApp
              </p>
            </div>

            <div className="flex min-h-[520px] flex-col gap-4 bg-[linear-gradient(180deg,#0b141a_0%,#111b21_100%)] p-5">
              {previews.length ? (
                previews.map((section, index) => (
                  <Bubble key={section.key} text={section.text} tone={index % 2 === 0 ? 'left' : 'right'} />
                ))
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-gray-200 dark:border-white/10 bg-white/5 px-8 text-center text-sm leading-7 text-white/45">
                  Digite os templates para visualizar aqui como a mensagem sera entregue para a cliente.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 dark:border-white/5 bg-[rgba(28,23,31,0.88)] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3 text-[#f7c1b6]">
              <Type className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.22em]">
                Variaveis disponiveis
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 dark:border-white/5 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c7adb4]"
                >
                  {'{{'}
                  {tag}
                  {'}}'}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-[22px] border border-[rgba(233,155,168,0.14)] bg-[rgba(233,155,168,0.08)] p-4 text-sm leading-6 text-[#d6bbc2]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#f7c1b6]" />
              <p>
                O sistema substitui automaticamente as chaves pelos dados reais do agendamento no momento do envio.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
