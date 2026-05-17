import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Plus, RefreshCcw, Save } from 'lucide-react';
import { saCreateFatura, saGerarFaturasAutomaticas, saGetBillingSettings, saGetFaturas, saGetSaloes, saUpdateBillingSettings, saUpdateFatura } from '../../services/api';
import { formatMoney, PLAN_LABELS, STATUS_LABELS } from './superAdminData';

function invoiceTone(status) {
  if (status === 'paga') return 'bg-emerald-500/12 text-emerald-200';
  if (status === 'vencida') return 'bg-red-500/12 text-red-200';
  if (status === 'comprovante_enviado') return 'bg-amber-500/12 text-amber-200';
  if (status === 'cancelada') return 'bg-white/10 text-white/50';
  return 'bg-sky-500/12 text-sky-200';
}

export default function SuperAdminBilling() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState('');
  const [settings, setSettings] = useState({
    nomeRecebedor: '',
    cpfCnpjRecebedor: '',
    chavePix: '',
    cidadeRecebedor: '',
    descricaoPadrao: '',
    instrucoesPagamento: '',
    basicPrice: 99,
    proPrice: 199,
    enterprisePrice: 499,
    dueDay: 10,
    autoBillingEnabled: true,
  });
  const [saloes, setSaloes] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({
    salaoId: '',
    competencia: '',
    descricao: '',
    valor: '',
    vencimento: '',
    observacoesInternas: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, saloesRes, faturasRes] = await Promise.all([
        saGetBillingSettings(),
        saGetSaloes(),
        saGetFaturas(),
      ]);
      if (settingsRes.data) {
        setSettings({
          nomeRecebedor: settingsRes.data.nomeRecebedor || '',
          cpfCnpjRecebedor: settingsRes.data.cpfCnpjRecebedor || '',
          chavePix: settingsRes.data.chavePix || '',
          cidadeRecebedor: settingsRes.data.cidadeRecebedor || '',
          descricaoPadrao: settingsRes.data.descricaoPadrao || '',
          instrucoesPagamento: settingsRes.data.instrucoesPagamento || '',
          basicPrice: Number(settingsRes.data.basicPrice || 99),
          proPrice: Number(settingsRes.data.proPrice || 199),
          enterprisePrice: Number(settingsRes.data.enterprisePrice || 499),
          dueDay: Number(settingsRes.data.dueDay || 10),
          autoBillingEnabled: settingsRes.data.autoBillingEnabled !== false,
        });
      }

      const nextSaloes = saloesRes.data || [];
      setSaloes(nextSaloes);
      setFaturas(faturasRes.data || []);
      setInvoiceForm((prev) => ({ ...prev, salaoId: prev.salaoId || nextSaloes[0]?.id || '' }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar o billing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const resumo = useMemo(() => {
    return {
      abertas: faturas.filter((item) => ['aberta', 'vencida', 'comprovante_enviado'].includes(item.status)).length,
      pagas: faturas.filter((item) => item.status === 'paga').length,
      mrrManual: faturas.filter((item) => item.status === 'paga').reduce((sum, item) => sum + Number(item.valorPago || item.valor || 0), 0),
    };
  }, [faturas]);

  useEffect(() => {
    const salao = saloes.find((item) => item.id === invoiceForm.salaoId);
    if (!salao) return;
    const suggestedValue = Number(settings?.[`${salao.plano}Price`] || 0);
    setInvoiceForm((prev) => {
      if (prev.valor && Number(prev.valor) > 0) return prev;
      return { ...prev, valor: suggestedValue ? String(suggestedValue) : prev.valor };
    });
  }, [invoiceForm.salaoId, saloes, settings]);

  async function saveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    try {
      await saUpdateBillingSettings(settings);
      toast.success('Configuracao PIX atualizada.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel salvar a configuracao PIX.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function gerarFaturasAutomaticas() {
    setGeneratingInvoices(true);
    try {
      const response = await saGerarFaturasAutomaticas();
      toast.success(`${response.data?.criadas || 0} fatura(s) geradas para o ciclo atual.`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel gerar as faturas automaticas.');
    } finally {
      setGeneratingInvoices(false);
    }
  }

  async function createInvoice(event) {
    event.preventDefault();
    setCreatingInvoice(true);
    try {
      await saCreateFatura({
        ...invoiceForm,
        valor: Number(invoiceForm.valor),
      });
      toast.success('Fatura emitida com sucesso.');
      setInvoiceForm((prev) => ({ ...prev, competencia: '', descricao: '', valor: '', vencimento: '', observacoesInternas: '' }));
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel emitir a fatura.');
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function marcarComoPaga(fatura) {
    setUpdatingInvoiceId(fatura.id);
    try {
      await saUpdateFatura(fatura.id, {
        status: 'paga',
        valorPago: fatura.valor,
      });
      toast.success('Fatura marcada como paga.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel atualizar a fatura.');
    } finally {
      setUpdatingInvoiceId('');
    }
  }

  if (loading) {
    return <StateBox message="Carregando billing..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.5rem] border border-white/6 bg-[#231b22] p-6 sm:p-8">
        <p className="brand-kicker">Billing SaaS</p>
        <h1 className="mt-3 font-brand-display text-5xl leading-none text-white">Faturas, PIX global e comprovantes</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/58">
          Configure o PIX do superadmin, emita faturas para os saloes e acompanhe comprovantes enviados pelo painel do cliente.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Kpi title="Faturas abertas" value={resumo.abertas} />
        <Kpi title="Faturas pagas" value={resumo.pagas} />
        <Kpi title="Recebido" value={formatMoney(resumo.mrrManual)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={saveSettings} className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[#efb1bb]" />
            <h2 className="text-lg font-black text-white">Configuracao PIX global</h2>
          </div>
          <Field label="Nome recebedor" value={settings.nomeRecebedor} onChange={(value) => setSettings((prev) => ({ ...prev, nomeRecebedor: value }))} />
          <Field label="CPF/CNPJ" value={settings.cpfCnpjRecebedor} onChange={(value) => setSettings((prev) => ({ ...prev, cpfCnpjRecebedor: value }))} />
          <Field label="Chave PIX" value={settings.chavePix} onChange={(value) => setSettings((prev) => ({ ...prev, chavePix: value }))} />
          <Field label="Cidade" value={settings.cidadeRecebedor} onChange={(value) => setSettings((prev) => ({ ...prev, cidadeRecebedor: value }))} />
          <Field label="Descricao padrao" value={settings.descricaoPadrao} onChange={(value) => setSettings((prev) => ({ ...prev, descricaoPadrao: value }))} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={`Basic (${PLAN_LABELS.basic})`} type="number" value={settings.basicPrice} onChange={(value) => setSettings((prev) => ({ ...prev, basicPrice: value }))} />
            <Field label={`Pro (${PLAN_LABELS.pro})`} type="number" value={settings.proPrice} onChange={(value) => setSettings((prev) => ({ ...prev, proPrice: value }))} />
            <Field label={`Enterprise (${PLAN_LABELS.enterprise})`} type="number" value={settings.enterprisePrice} onChange={(value) => setSettings((prev) => ({ ...prev, enterprisePrice: value }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <Field label="Dia vencimento" type="number" value={settings.dueDay} onChange={(value) => setSettings((prev) => ({ ...prev, dueDay: value }))} />
            <Toggle
              label="Cobranca automatica mensal"
              checked={settings.autoBillingEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, autoBillingEnabled: checked }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Instrucoes de pagamento</label>
            <textarea
              rows={4}
              value={settings.instrucoesPagamento}
              onChange={(event) => setSettings((prev) => ({ ...prev, instrucoesPagamento: event.target.value }))}
              className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <button type="submit" disabled={savingSettings} className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-white/[0.08] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60">
              <Save className="h-4 w-4" />
              {savingSettings ? 'Salvando...' : 'Salvar billing'}
            </button>
            <button type="button" onClick={gerarFaturasAutomaticas} disabled={generatingInvoices} className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#de97a5]/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffdbe2] disabled:opacity-60">
              <RefreshCcw className="h-4 w-4" />
              {generatingInvoices ? 'Gerando...' : 'Gerar ciclo atual'}
            </button>
          </div>
        </form>

        <form onSubmit={createInvoice} className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-[#efb1bb]" />
            <h2 className="text-lg font-black text-white">Emitir nova fatura</h2>
          </div>
          <Select
            label="Salao"
            value={invoiceForm.salaoId}
            onChange={(value) => setInvoiceForm((prev) => ({ ...prev, salaoId: value }))}
            options={saloes.map((salao) => ({ value: salao.id, label: `${salao.nome} · ${PLAN_LABELS[salao.plano] || salao.plano}` }))}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Competencia" value={invoiceForm.competencia} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, competencia: value }))} />
            <Field label="Valor" type="number" value={invoiceForm.valor} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, valor: value }))} />
          </div>
          <Field label="Descricao" value={invoiceForm.descricao} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, descricao: value }))} />
          <Field label="Vencimento" type="date" value={invoiceForm.vencimento} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, vencimento: value }))} />
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Observacoes internas</label>
            <textarea
              rows={4}
              value={invoiceForm.observacoesInternas}
              onChange={(event) => setInvoiceForm((prev) => ({ ...prev, observacoesInternas: event.target.value }))}
              className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
            />
          </div>
          <button type="submit" disabled={creatingInvoice} className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-[#f0b5bf] via-[#de97a5] to-[#c77787] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60">
            <Plus className="h-4 w-4" />
            {creatingInvoice ? 'Emitindo...' : 'Emitir fatura'}
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/6 bg-[#231b22] p-6">
        <h2 className="text-lg font-black text-white">Historico de faturas</h2>
        <div className="mt-5 space-y-3">
          {faturas.length === 0 ? (
            <StateBox message="Nenhuma fatura emitida ainda." compact />
          ) : (
            faturas.map((fatura) => (
              <div key={fatura.id} className="rounded-[1.5rem] border border-white/6 bg-black/16 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{fatura.salao?.nome}</p>
                    <p className="mt-1 text-xs text-white/42">{fatura.competencia} · vence {new Date(fatura.vencimento).toLocaleDateString('pt-BR')}</p>
                    <p className="mt-2 text-lg font-black text-white">{formatMoney(fatura.valor)}</p>
                    {fatura.comprovanteUrl ? (
                      <a href={fatura.comprovanteUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-[#efb1bb]">
                        Ver comprovante enviado
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${invoiceTone(fatura.status)}`}>
                      {fatura.status.replaceAll('_', ' ')}
                    </span>
                    <span className="rounded-full bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/72">
                      {STATUS_LABELS[fatura.salao?.planoStatus] || fatura.salao?.planoStatus || 'sem status'}
                    </span>
                    {fatura.status !== 'paga' ? (
                      <button
                        onClick={() => marcarComoPaga(fatura)}
                        disabled={updatingInvoiceId === fatura.id}
                        className="rounded-full bg-emerald-500/14 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200 disabled:opacity-60"
                      >
                        {updatingInvoiceId === fatura.id ? 'Atualizando...' : 'Marcar paga'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
        required={type !== 'text' || label !== 'Descricao'}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex h-full cursor-pointer items-center justify-between rounded-[1.25rem] border border-white/8 bg-[#332832] px-4 py-3 text-sm text-white">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/64">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-[#de97a5]' : 'bg-white/12'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="rounded-[2rem] border border-white/6 bg-[#231b22] p-5">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{title}</p>
    </div>
  );
}

function StateBox({ message, compact = false }) {
  return (
    <div className={`rounded-[1.5rem] border border-white/6 bg-black/16 text-center text-white/54 ${compact ? 'px-4 py-6' : 'px-6 py-16'}`}>
      {message}
    </div>
  );
}
