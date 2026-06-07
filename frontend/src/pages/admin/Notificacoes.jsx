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
import { cn } from '../../lib/utils';

const TEMPLATE_SECTIONS = [
  {
    key: 'templateConfirmacao',
    titulo: 'Confirmação',
    descricao: 'Disparado automaticamente logo após o agendamento ser reservado.',
    icon: CheckCircle2,
  },
  {
    key: 'templateLembrete',
    titulo: 'Lembrete (24h antes)',
    descricao: 'Enviado para reconfirmar a presença da cliente no dia anterior.',
    icon: Bell,
  },
  {
    key: 'templateCancelamento',
    titulo: 'Cancelamento',
    descricao: 'Notificação automática caso o horário seja desmarcado.',
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
    .replace(/{{data}}/g, '16/06/2026')
    .replace(/{{hora}}/g, '14:30')
    .replace(/{{salao}}/g, salaoNome || 'BellaPro Agenda');
}

function Bubble({ text, tone = 'left' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn('flex max-w-[85%] flex-col', tone === 'left' ? 'self-start' : 'self-end')}
    >
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm border',
          tone === 'left'
            ? 'rounded-tl-none bg-white dark:bg-zinc-800 border-black/[0.04] dark:border-white/5 text-gray-800 dark:text-gray-200'
            : 'rounded-tr-none bg-[#e1f3e8] dark:bg-[#183925] border-[#c2e4cf] dark:border-[#204a32] text-gray-900 dark:text-white'
        )}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        <div className="mt-1.5 flex items-center justify-end gap-1 text-[8px] text-gray-400 dark:text-gray-500 font-medium">
          <span>14:31</span>
          {tone === 'right' && <span>• Enviado</span>}
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
      window.alert('Modelos de mensagens salvos com sucesso.');
    } catch {
      window.alert('Não foi possível salvar os modelos agora.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
      </div>
    );
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
            <MessageSquare className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Mensagens Automáticas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Modelos de <span className="text-[#d48997]">WhatsApp</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Personalize os avisos e lembretes enviados para as clientes e veja a simulação do envio em tempo real.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {salvando ? 'Salvando...' : 'Salvar Modelos'}
        </motion.button>
      </header>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        {/* Left column - Editors */}
        <div className="space-y-6">
          {TEMPLATE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.key}
                className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-black/[0.03] dark:border-white/5 pb-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d48997]/10 text-[#d48997]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-normal text-gray-900 dark:text-white">
                      {section.titulo}
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      {section.descricao}
                    </p>
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
                  rows={4}
                  placeholder="Escreva a mensagem e use as variáveis abaixo..."
                  className="w-full resize-none rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-4 text-xs leading-relaxed text-gray-800 dark:text-gray-200 outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400/70"
                />
              </div>
            );
          })}
        </div>

        {/* Right column - Simulator & Tags */}
        <aside className="space-y-6 lg:self-start lg:sticky lg:top-4">
          <div className="flex items-center gap-2 border-b border-black/[0.03] dark:border-white/5 pb-2">
            <Eye className="h-4 w-4 text-[#d48997]" />
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              Simulação de Tela
            </span>
          </div>

          {/* WhatsApp Simulator */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/10 bg-gray-50 dark:bg-zinc-900 shadow-md">
            <div className="border-b border-black/[0.04] dark:border-white/5 bg-gray-100 dark:bg-zinc-800 px-4 py-3.5">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{salaoNome || 'BellaPro Agenda'}</h4>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-0.5">
                Notificação WhatsApp
              </p>
            </div>

            <div className="flex min-h-[360px] max-h-[460px] overflow-y-auto flex-col gap-3.5 p-4 bg-gray-100/50 dark:bg-zinc-950/20 custom-scrollbar">
              {previews.length > 0 ? (
                previews.map((section, index) => (
                  <Bubble key={section.key} text={section.text} tone={index % 2 === 0 ? 'left' : 'right'} />
                ))
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-black/[0.08] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] px-6 py-8 text-center text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  Digite os modelos de mensagens na esquerda para visualizar como elas aparecerão no celular da cliente.
                </div>
              )}
            </div>
          </div>

          {/* Available variables */}
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#d48997]">
              <Type className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Variáveis Dinâmicas
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/5 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-300"
                >
                  {`{{${tag}}}`}
                </span>
              ))}
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-[#d48997]/5 border border-[#d48997]/10 p-3.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              <Info className="h-4 w-4 shrink-0 text-[#d48997] mt-0.5" />
              <p>
                As variáveis dinâmicas serão substituídas automaticamente pelos dados reais da cliente e do agendamento no momento do envio.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
