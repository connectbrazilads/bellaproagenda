import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, FileText, Upload, DollarSign, Calendar, Landmark, Check, AlertTriangle } from 'lucide-react';
import { enviarComprovanteFatura, getFaturasSalao, uploadImage } from '../../services/api';
import { cn } from '../../lib/utils';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function statusTone(status) {
  if (status === 'paga') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
  if (status === 'vencida') return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
  if (status === 'comprovante_enviado') return 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20';
  if (status === 'cancelada') return 'bg-gray-500/10 text-gray-500 border border-gray-500/20';
  return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
}

function statusLabel(status) {
  if (status === 'comprovante_enviado') return 'Comprovante Enviado';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Faturas() {
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState('');
  const [faturas, setFaturas] = useState([]);
  const [selectedFile, setSelectedFile] = useState({});

  async function load() {
    setLoading(true);
    try {
      const response = await getFaturasSalao();
      setFaturas(response.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível carregar as faturas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  }

  async function enviarComprovante(fatura) {
    const file = selectedFile[fatura.id];
    if (!file) {
      toast.error('Selecione o comprovante antes de enviar.');
      return;
    }

    setSubmittingId(fatura.id);
    try {
      const uploadResponse = await uploadImage(file);
      const comprovanteUrl = uploadResponse.data?.url;
      await enviarComprovanteFatura(fatura.id, {
        comprovanteUrl,
        comprovanteNome: file.name,
      });
      toast.success('Comprovante enviado para validação.');
      setSelectedFile((prev) => ({ ...prev, [fatura.id]: null }));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível enviar o comprovante.');
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 px-4">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <Landmark className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Mensalidade SaaS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Faturas &amp; <span className="text-[#d48997]">Assinatura</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Acompanhe o histórico de faturas do plano BellaPro, realize pagamentos via PIX e anexe comprovantes.
          </p>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
        </div>
      ) : faturas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.01] px-8 py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
          <h2 className="mt-4 font-serif text-lg text-gray-800 dark:text-gray-200">Nenhuma fatura lançada</h2>
          <p className="mx-auto mt-2 max-w-xs text-xs text-gray-400 dark:text-gray-500">
            Sua conta está ativa e nenhuma fatura pendente foi registrada pelo administrador do sistema.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {faturas.map((fatura) => (
            <article key={fatura.id} className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-semibold text-[#d48997] uppercase tracking-wider">{fatura.competencia}</span>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatMoney(fatura.valor)}</h2>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Vencimento: {formatDate(fatura.vencimento)}
                    </p>
                  </div>
                  <span className={cn('rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider', statusTone(fatura.status))}>
                    {statusLabel(fatura.status)}
                  </span>
                </div>

                {fatura.descricao && (
                  <p className="mt-4 text-xs text-gray-450 dark:text-gray-400 leading-relaxed border-t border-black/[0.03] dark:border-white/5 pt-3">
                    {fatura.descricao}
                  </p>
                )}

                {/* PIX Data Area */}
                <div className="mt-5 rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 space-y-3 text-xs">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997] block">Dados para Pagamento PIX</span>
                  
                  <div className="space-y-2.5">
                    <InfoRow label="Recebedor" value={fatura.pixNomeRecebedor} />
                    <InfoRow label="CPF/CNPJ" value={fatura.pixCpfCnpjRecebedor} />
                    <InfoRow
                      label="Chave PIX"
                      value={fatura.pixChave}
                      actionLabel="Copiar"
                      onAction={() => copyText(fatura.pixChave, 'Chave PIX')}
                    />
                    <InfoRow label="Cidade" value={fatura.pixCidadeRecebedor} />
                    <InfoRow
                      label="Payload (Copia e Cola)"
                      value={fatura.pixPayload || 'Não gerado'}
                      actionLabel="Copiar"
                      onAction={() => copyText(fatura.pixPayload || '', 'Payload PIX')}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* Actions row */}
                <div className="grid gap-2.5 grid-cols-2">
                  <button
                    onClick={() => copyText(fatura.pixPayload || fatura.pixChave, 'PIX')}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#18181b] px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar PIX
                  </button>
                  {fatura.comprovanteUrl ? (
                    <a
                      href={fatura.comprovanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#18181b] px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Comprovante
                    </a>
                  ) : (
                    <div className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/[0.08] dark:border-white/10 px-4 text-xs font-medium text-gray-400 dark:text-gray-500">
                      <FileText className="h-3.5 w-3.5" />
                      Sem Comprovante
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="border-t border-black/[0.03] dark:border-white/5 pt-4 space-y-3">
                  <label className="block rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] p-3 text-xs">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Anexar Comprovante</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(event) =>
                        setSelectedFile((prev) => ({ ...prev, [fatura.id]: event.target.files?.[0] || null }))
                      }
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-[#d48997]/10 file:text-[#d48997] hover:file:bg-[#d48997]/25 file:cursor-pointer"
                    />
                  </label>
                  <button
                    onClick={() => enviarComprovante(fatura)}
                    disabled={submittingId === fatura.id}
                    className="w-full flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white text-xs font-semibold transition shadow-sm disabled:opacity-55"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {submittingId === fatura.id ? 'Enviando...' : 'Enviar Comprovante'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, actionLabel, onAction }) {
  return (
    <div className="rounded-lg border border-black/[0.03] dark:border-white/5 bg-white dark:bg-[#18181b] p-3">
      <div className="flex items-start justify-between gap-3 text-xs">
        <div className="min-w-0">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">{label}</span>
          <p className="mt-1 break-all text-xs font-semibold text-gray-700 dark:text-zinc-200">{value || '-'}</p>
        </div>
        {actionLabel && onAction && (
          <button onClick={onAction} className="inline-flex h-7 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-2.5 text-[10px] font-semibold text-[#d48997] transition shrink-0 hover:bg-[#d48997]/5">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
