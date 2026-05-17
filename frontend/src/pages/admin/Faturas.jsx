import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, FileText, Upload } from 'lucide-react';
import { enviarComprovanteFatura, getFaturasSalao, uploadImage } from '../../services/api';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function statusTone(status) {
  if (status === 'paga') return 'bg-emerald-500/12 text-emerald-200';
  if (status === 'vencida') return 'bg-red-500/12 text-red-200';
  if (status === 'comprovante_enviado') return 'bg-amber-500/12 text-amber-200';
  if (status === 'cancelada') return 'bg-white/10 text-white/50';
  return 'bg-sky-500/12 text-sky-200';
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
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar as faturas.');
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
      toast.error(`Nao foi possivel copiar ${label.toLowerCase()}.`);
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
      toast.success('Comprovante enviado para validacao.');
      setSelectedFile((prev) => ({ ...prev, [fatura.id]: null }));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel enviar o comprovante.');
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
        <p className="brand-kicker">Financeiro SaaS</p>
        <h1 className="mt-3 text-4xl font-brand-display text-white">Faturas e pagamentos via PIX</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/58">
          Consulte faturas abertas e historico de pagamentos. Quando pagar via PIX, envie o comprovante por aqui.
        </p>
      </section>

      {loading ? (
        <StateBox message="Carregando faturas..." />
      ) : faturas.length === 0 ? (
        <StateBox message="Nenhuma fatura disponivel no momento." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {faturas.map((fatura) => (
            <article key={fatura.id} className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">{fatura.competencia}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{formatMoney(fatura.valor)}</h2>
                  <p className="mt-2 text-sm text-white/54">
                    Vencimento em {formatDate(fatura.vencimento)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${statusTone(fatura.status)}`}>
                  {fatura.status.replaceAll('_', ' ')}
                </span>
              </div>

              {fatura.descricao ? (
                <p className="mt-4 text-sm leading-relaxed text-white/60">{fatura.descricao}</p>
              ) : null}

              <div className="mt-5 rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Dados PIX desta fatura</p>
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  <InfoRow label="Recebedor" value={fatura.pixNomeRecebedor} />
                  <InfoRow label="CPF/CNPJ" value={fatura.pixCpfCnpjRecebedor} />
                  <InfoRow
                    label="Chave PIX"
                    value={fatura.pixChave}
                    actionLabel="Copiar chave"
                    onAction={() => copyText(fatura.pixChave, 'Chave PIX')}
                  />
                  <InfoRow label="Cidade" value={fatura.pixCidadeRecebedor} />
                  <InfoRow
                    label="Payload"
                    value={fatura.pixPayload || 'Payload nao gerado'}
                    actionLabel="Copiar payload"
                    onAction={() => copyText(fatura.pixPayload || '', 'Payload PIX')}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => copyText(fatura.pixPayload || fatura.pixChave, 'PIX')}
                  className="flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/76"
                >
                  <Copy className="h-4 w-4" />
                  Copiar PIX
                </button>
                {fatura.comprovanteUrl ? (
                  <a
                    href={fatura.comprovanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/76"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver comprovante
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-[1.2rem] border border-dashed border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                    <FileText className="h-4 w-4" />
                    Sem comprovante
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <label className="block rounded-[1.2rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white/70">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Anexar comprovante</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) =>
                      setSelectedFile((prev) => ({ ...prev, [fatura.id]: event.target.files?.[0] || null }))
                    }
                    className="block w-full text-sm text-white/72 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                  />
                </label>
                <button
                  onClick={() => enviarComprovante(fatura)}
                  disabled={submittingId === fatura.id}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {submittingId === fatura.id ? 'Enviando...' : 'Enviar comprovante'}
                </button>
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
    <div className="rounded-[1.2rem] border border-white/6 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">{label}</p>
          <p className="mt-2 break-all text-sm text-white/76">{value || '-'}</p>
        </div>
        {actionLabel && onAction ? (
          <button onClick={onAction} className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/76">
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StateBox({ message }) {
  return (
    <div className="rounded-[2rem] border border-white/6 bg-[#231b22] px-6 py-16 text-center text-white/54">
      {message}
    </div>
  );
}
