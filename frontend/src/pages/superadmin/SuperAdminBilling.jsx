import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Plus, RefreshCcw, Save } from 'lucide-react';
import { saCreateFatura, saGerarFaturasAutomaticas, saGetBillingSettings, saGetFaturas, saGetSaloes, saUpdateBillingSettings, saUpdateFatura } from '../../services/api';
import { formatMoney, PLAN_LABELS, STATUS_LABELS } from './superAdminData';

function invoiceTone(status) {
  if (status === 'paga') return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'vencida') return 'border border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'comprovante_enviado') return 'border border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'cancelada') return 'border border-[#EAE1E4] bg-[#FAF7F5] text-[#8E7682]';
  return 'border border-sky-200 bg-sky-50 text-sky-700';
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
      toast.error(error.response?.data?.error || 'Não foi possível carregar o billing.');
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
      toast.success('Configuração PIX atualizada.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível salvar a configuração PIX.');
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
      toast.error(error.response?.data?.error || 'Não foi possível gerar as faturas automáticas.');
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
      toast.error(error.response?.data?.error || 'Não foi possível emitir a fatura.');
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
      toast.error(error.response?.data?.error || 'Não foi possível atualizar a fatura.');
    } finally {
      setUpdatingInvoiceId('');
    }
  }

  if (loading) {
    return <StateBox message="Carregando billing..." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B84C6B]">Billing SaaS</p>
        <h1 className="mt-2 font-brand-display text-3xl font-semibold tracking-tight text-[#23141C] sm:text-4xl">
          Faturas, PIX global e comprovantes
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#6B5761]">
          Configure o PIX do superadmin, emita faturas para os salões e acompanhe comprovantes enviados pelo painel do cliente.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Kpi title="Faturas abertas" value={resumo.abertas} />
        <Kpi title="Faturas pagas" value={resumo.pagas} />
        <Kpi title="Recebido" value={formatMoney(resumo.mrrManual)} accent />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={saveSettings} className="space-y-4 rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF7F9] text-[#B84C6B]">
              <CreditCard className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-[#23141C]">Configuração PIX global</h2>
          </div>
          <Field label="Nome recebedor" value={settings.nomeRecebedor} onChange={(value) => setSettings((prev) => ({ ...prev, nomeRecebedor: value }))} />
          <Field label="CPF/CNPJ" value={settings.cpfCnpjRecebedor} onChange={(value) => setSettings((prev) => ({ ...prev, cpfCnpjRecebedor: value }))} />
          <Field label="Chave PIX" value={settings.chavePix} onChange={(value) => setSettings((prev) => ({ ...prev, chavePix: value }))} />
          <Field label="Cidade" value={settings.cidadeRecebedor} onChange={(value) => setSettings((prev) => ({ ...prev, cidadeRecebedor: value }))} />
          <Field label="Descrição padrão" value={settings.descricaoPadrao} onChange={(value) => setSettings((prev) => ({ ...prev, descricaoPadrao: value }))} />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={`Basic (${PLAN_LABELS.basic})`} type="number" value={settings.basicPrice} onChange={(value) => setSettings((prev) => ({ ...prev, basicPrice: value }))} />
            <Field label={`Pro (${PLAN_LABELS.pro})`} type="number" value={settings.proPrice} onChange={(value) => setSettings((prev) => ({ ...prev, proPrice: value }))} />
            <Field label={`Enterprise (${PLAN_LABELS.enterprise})`} type="number" value={settings.enterprisePrice} onChange={(value) => setSettings((prev) => ({ ...prev, enterprisePrice: value }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-[150px_1fr]">
            <Field label="Dia vencimento" type="number" value={settings.dueDay} onChange={(value) => setSettings((prev) => ({ ...prev, dueDay: value }))} />
            <Toggle
              label="Cobrança automática mensal"
              checked={settings.autoBillingEnabled}
              onChange={(checked) => setSettings((prev) => ({ ...prev, autoBillingEnabled: checked }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Instruções de pagamento</label>
            <textarea
              rows={3}
              value={settings.instrucoesPagamento}
              onChange={(event) => setSettings((prev) => ({ ...prev, instrucoesPagamento: event.target.value }))}
              className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <button type="submit" disabled={savingSettings} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#23141C] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#3A222E] disabled:opacity-60">
              <Save className="h-4 w-4" />
              {savingSettings ? 'Salvando...' : 'Salvar billing'}
            </button>
            <button type="button" onClick={gerarFaturasAutomaticas} disabled={generatingInvoices} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#F0D5DE] bg-[#FDF7F9] px-4 py-3 text-xs font-bold text-[#B84C6B] transition hover:bg-[#F9EBF0] disabled:opacity-60">
              <RefreshCcw className="h-4 w-4" />
              {generatingInvoices ? 'Gerando...' : 'Gerar ciclo atual'}
            </button>
          </div>
        </form>

        <form onSubmit={createInvoice} className="space-y-4 rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF7F9] text-[#B84C6B]">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-[#23141C]">Emitir nova fatura</h2>
          </div>
          <Select
            label="Salão"
            value={invoiceForm.salaoId}
            onChange={(value) => setInvoiceForm((prev) => ({ ...prev, salaoId: value }))}
            options={saloes.map((salao) => ({ value: salao.id, label: `${salao.nome} · ${PLAN_LABELS[salao.plano] || salao.plano}` }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Competência" value={invoiceForm.competencia} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, competencia: value }))} />
            <Field label="Valor" type="number" value={invoiceForm.valor} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, valor: value }))} />
          </div>
          <Field label="Descrição" value={invoiceForm.descricao} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, descricao: value }))} optional />
          <Field label="Vencimento" type="date" value={invoiceForm.vencimento} onChange={(value) => setInvoiceForm((prev) => ({ ...prev, vencimento: value }))} />
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">Observações internas</label>
            <textarea
              rows={3}
              value={invoiceForm.observacoesInternas}
              onChange={(event) => setInvoiceForm((prev) => ({ ...prev, observacoesInternas: event.target.value }))}
              className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-3 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
            />
          </div>
          <button type="submit" disabled={creatingInvoice} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B84C6B] px-4 py-3.5 text-xs font-bold text-white transition hover:bg-[#9E3E5A] disabled:opacity-60">
            <Plus className="h-4 w-4" />
            {creatingInvoice ? 'Emitindo...' : 'Emitir fatura'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-[#EAE1E4] bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-[#23141C]">Histórico de faturas</h2>
        <div className="mt-5 space-y-3">
          {faturas.length === 0 ? (
            <StateBox message="Nenhuma fatura emitida ainda." compact />
          ) : (
            faturas.map((fatura) => (
              <div key={fatura.id} className="rounded-2xl border border-[#EFE7EA] bg-[#FAF7F5] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#23141C]">{fatura.salao?.nome}</p>
                    <p className="mt-0.5 text-xs text-[#6B5761]">{fatura.competencia} · vence {new Date(fatura.vencimento).toLocaleDateString('pt-BR')}</p>
                    <p className="mt-1.5 text-lg font-bold text-[#23141C]">{formatMoney(fatura.valor)}</p>
                    {fatura.comprovanteUrl ? (
                      <a href={fatura.comprovanteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#B84C6B] underline-offset-2 hover:underline">
                        Ver comprovante enviado
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${invoiceTone(fatura.status)}`}>
                      {fatura.status.replaceAll('_', ' ')}
                    </span>
                    <span className="rounded-full border border-[#EAE1E4] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">
                      {STATUS_LABELS[fatura.salao?.planoStatus] || fatura.salao?.planoStatus || 'sem status'}
                    </span>
                    {fatura.status !== 'paga' ? (
                      <button
                        onClick={() => marcarComoPaga(fatura)}
                        disabled={updatingInvoiceId === fatura.id}
                        className="rounded-full border border-emerald-200 bg-emerald-600 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-emerald-700 disabled:opacity-60"
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

function Field({ label, value, onChange, type = 'text', optional = false }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
        required={!optional}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5 text-sm text-[#23141C] outline-none transition focus:border-[#B84C6B] focus:bg-white"
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
    <div className="flex h-full items-center justify-between gap-3 rounded-xl border border-[#E2D5DA] bg-[#FAF7F5] px-4 py-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B5761]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#B84C6B]' : 'bg-[#D5C9CE]'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function Kpi({ title, value, accent = false }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${accent ? 'border-[#23141C] bg-[#23141C] text-white' : 'border-[#EAE1E4] bg-white text-[#23141C]'}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className={`mt-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${accent ? 'text-white/65' : 'text-[#8E7682]'}`}>{title}</p>
    </div>
  );
}

function StateBox({ message, compact = false }) {
  return (
    <div className={`rounded-2xl border border-[#EAE1E4] bg-[#FAF7F5] text-center text-sm text-[#6B5761] ${compact ? 'px-4 py-8' : 'px-6 py-16'}`}>
      {message}
    </div>
  );
}
