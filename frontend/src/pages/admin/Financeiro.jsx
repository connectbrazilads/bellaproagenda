import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  FileText,
  PlusCircle,
  Printer,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  addMovimentoCaixa,
  abrirCaixa,
  fecharCaixa,
  getCaixaAtual,
  getCaixaRelatorioDiario,
  getCaixaSessoes,
  getFechamentoDiario,
  getFinanceiro,
} from '../../services/api';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn, downloadCsv, formatDateInput, getStartOfMonthInput } from '../../lib/utils';
import { getEffectiveActionPermissions, readStoredActionPermissions } from '../../lib/permissions';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPlain(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function StatCard({ label, value, icon, tone = 'rose', plain = false }) {
  const tones = {
    rose: 'bg-[rgba(233,155,168,0.12)] text-[#f7c1b6]',
    gold: 'bg-[rgba(240,193,121,0.12)] text-[#f0c179]',
    green: 'bg-[rgba(92,170,128,0.12)] text-[#9be0bb]',
    ink: 'bg-[rgba(255,255,255,0.05)] text-[#faf7f6]',
  };

  return (
    <div className="rounded-[28px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
      <div className="mb-5 flex items-center justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px]', tones[tone])}>
          {React.cloneElement(icon, { className: 'h-5 w-5' })}
        </div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9f848d]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#faf7f6]">
        {plain ? formatPlain(value) : formatMoney(value)}
      </p>
    </div>
  );
}

function MiniResumo({ label, value, plain = false, highlight = false }) {
  return (
    <div
      className={cn(
        'rounded-[20px] border p-4',
        highlight
          ? 'border-[rgba(233,155,168,0.22)] bg-[rgba(233,155,168,0.08)]'
          : 'border-white/8 bg-[rgba(255,255,255,0.03)]'
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#faf7f6]">{plain ? formatPlain(value) : formatMoney(value)}</p>
    </div>
  );
}

function FieldMoney({ label, value, onChange }) {
  return (
    <label className="block space-y-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-full rounded-[20px] border border-white/8 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none"
      />
    </label>
  );
}

function FieldText({ label, value, onChange, placeholder }) {
  return (
    <label className="block space-y-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-[20px] border border-white/8 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none placeholder:text-[#806871]"
      />
    </label>
  );
}

function printHtml(title, body) {
  const popup = window.open('', '_blank', 'width=980,height=760');
  if (!popup) return;

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1, h2, h3 { margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; text-transform: uppercase; letter-spacing: 0.08em; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 14px 16px; background: #f9fafb; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #6b7280; margin-bottom: 8px; font-weight: 700; }
          .value { font-size: 20px; font-weight: 800; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);

  popup.document.close();
  popup.focus();
  popup.print();
}

export default function Financeiro() {
  const [data, setData] = useState(null);
  const [caixaAtual, setCaixaAtual] = useState(null);
  const [caixaHistorico, setCaixaHistorico] = useState([]);
  const [caixaRelatorioDiario, setCaixaRelatorioDiario] = useState(null);
  const [fechamentoDiario, setFechamentoDiario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCaixa, setSavingCaixa] = useState(false);
  const [showAllProfissionais, setShowAllProfissionais] = useState(false);
  const [turnoNome, setTurnoNome] = useState('Turno Manha');
  const [fundoInicial, setFundoInicial] = useState('0');
  const [recebidoDeNome, setRecebidoDeNome] = useState('');
  const [dinheiroInformado, setDinheiroInformado] = useState('');
  const [entregueParaNome, setEntregueParaNome] = useState('');
  const [movimentoTipo, setMovimentoTipo] = useState('sangria');
  const [movimentoValor, setMovimentoValor] = useState('');
  const [movimentoDescricao, setMovimentoDescricao] = useState('');
  const [assinaturaFechamento, setAssinaturaFechamento] = useState('');
  const [datas, setDatas] = useState({
    inicio: getStartOfMonthInput(),
    fim: formatDateInput(),
  });
  const [dataRelatorioCaixa, setDataRelatorioCaixa] = useState(formatDateInput());
  const equipeRef = useRef(null);

  const role = localStorage.getItem('salao_user_role') || 'gestor';
  const actionPermissions = getEffectiveActionPermissions(role, readStoredActionPermissions());
  const canAbrirCaixa = actionPermissions.includes('financeiro.caixa.abrir');
  const canMovimentarCaixa = actionPermissions.includes('financeiro.caixa.movimentar');
  const canFecharCaixa = actionPermissions.includes('financeiro.caixa.fechar');

  useEffect(() => {
    carregar();
  }, [datas, dataRelatorioCaixa]);

  async function carregar() {
    setLoading(true);
    try {
      const [
        financeiroResponse,
        caixaAtualResponse,
        caixaHistoricoResponse,
        caixaRelatorioResponse,
        fechamentoResponse,
      ] = await Promise.all([
        getFinanceiro(datas),
        getCaixaAtual(),
        getCaixaSessoes(),
        getCaixaRelatorioDiario({ data: dataRelatorioCaixa }),
        getFechamentoDiario({ data: dataRelatorioCaixa }),
      ]);

      setData(financeiroResponse?.data || null);
      setCaixaAtual(caixaAtualResponse?.data || null);
      setCaixaHistorico(caixaHistoricoResponse?.data || []);
      setCaixaRelatorioDiario(caixaRelatorioResponse?.data || null);
      setFechamentoDiario(fechamentoResponse?.data || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAbrirCaixa() {
    setSavingCaixa(true);
    try {
      await abrirCaixa({
        turnoNome,
        fundoInicial: Number(fundoInicial || 0),
        recebidoDeNome,
      });
      await carregar();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Erro ao abrir caixa.');
    } finally {
      setSavingCaixa(false);
    }
  }

  async function handleFecharCaixa() {
    if (!caixaAtual?.id) return;
    setSavingCaixa(true);
    try {
      await fecharCaixa(caixaAtual.id, {
        dinheiroInformado: Number(dinheiroInformado || 0),
        entregueParaNome,
        assinaturaFechamento,
      });
      setDinheiroInformado('');
      setAssinaturaFechamento('');
      await carregar();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Erro ao fechar caixa.');
    } finally {
      setSavingCaixa(false);
    }
  }

  async function handleMovimentoCaixa() {
    if (!caixaAtual?.id) return;
    setSavingCaixa(true);
    try {
      await addMovimentoCaixa(caixaAtual.id, {
        tipo: movimentoTipo,
        valor: Number(movimentoValor || 0),
        descricao: movimentoDescricao,
      });
      setMovimentoValor('');
      setMovimentoDescricao('');
      await carregar();
    } catch (error) {
      window.alert(error?.response?.data?.error || 'Erro ao registrar movimento.');
    } finally {
      setSavingCaixa(false);
    }
  }

  function imprimirFechamento(sessao) {
    const formas = Object.entries(sessao?.resumo?.porForma || {})
      .map(([forma, valor]) => `<tr><td>${forma}</td><td style="text-align:right">${formatMoney(valor)}</td></tr>`)
      .join('');
    const movimentos = (sessao?.movimentos || [])
      .map(
        (movimento) =>
          `<tr><td>${movimento.tipo}</td><td>${movimento.descricao || '-'}</td><td style="text-align:right">${formatMoney(
            movimento.valor
          )}</td><td>${new Date(movimento.createdAt).toLocaleString('pt-BR')}</td></tr>`
      )
      .join('');

    printHtml(
      'Fechamento de Caixa',
      `
      <h1>Fechamento de Caixa</h1>
      <p><strong>Turno:</strong> ${sessao.turnoNome}</p>
      <p><strong>Abertura:</strong> ${new Date(sessao.abertoEm).toLocaleString('pt-BR')}</p>
      <p><strong>Fechamento:</strong> ${sessao.fechadoEm ? new Date(sessao.fechadoEm).toLocaleString('pt-BR') : '-'}</p>
      <p><strong>Recebido de:</strong> ${sessao.recebidoDeNome || '-'}</p>
      <p><strong>Entregue para:</strong> ${sessao.entregueParaNome || '-'}</p>
      <p><strong>Assinatura:</strong> ${sessao.assinaturaFechamento || '-'}</p>
      <hr />
      <p><strong>Fundo inicial:</strong> ${formatMoney(sessao.fundoInicial)}</p>
      <p><strong>Receita do turno:</strong> ${formatMoney(sessao.resumo?.totalRecebido)}</p>
      <p><strong>Recebido em dinheiro:</strong> ${formatMoney(sessao.resumo?.totalDinheiro)}</p>
      <p><strong>Sangrias:</strong> ${formatMoney(sessao.resumo?.totalSangrias)}</p>
      <p><strong>Suprimentos:</strong> ${formatMoney(sessao.resumo?.totalSuprimentos)}</p>
      <p><strong>Dinheiro esperado:</strong> ${formatMoney(sessao.dinheiroEsperado)}</p>
      <p><strong>Dinheiro contado:</strong> ${formatMoney(sessao.dinheiroInformado)}</p>
      <p><strong>Diferenca:</strong> ${formatMoney(sessao.diferencaDinheiro)}</p>
      <h3>Por forma de pagamento</h3>
      <table><tbody>${formas || '<tr><td colspan="2">Sem pagamentos</td></tr>'}</tbody></table>
      <h3 style="margin-top:24px;">Movimentos do caixa</h3>
      <table>
        <thead><tr><th>Tipo</th><th>Descricao</th><th>Valor</th><th>Data/Hora</th></tr></thead>
        <tbody>${movimentos || '<tr><td colspan="4">Sem movimentos</td></tr>'}</tbody>
      </table>
    `
    );
  }

  function imprimirRelatorioDiario() {
    const sessoes = (caixaRelatorioDiario?.sessoes || [])
      .map(
        (sessao) => `
      <tr>
        <td>${sessao.turnoNome}</td>
        <td>${new Date(sessao.abertoEm).toLocaleString('pt-BR')}</td>
        <td>${sessao.fechadoEm ? new Date(sessao.fechadoEm).toLocaleString('pt-BR') : '-'}</td>
        <td>${sessao.recebidoDeNome || '-'}</td>
        <td>${sessao.entregueParaNome || '-'}</td>
        <td>${sessao.assinaturaFechamento || '-'}</td>
        <td style="text-align:right">${formatMoney(sessao.resumo?.totalRecebido)}</td>
        <td style="text-align:right">${formatMoney(sessao.dinheiroEsperado)}</td>
        <td style="text-align:right">${formatMoney(sessao.diferencaDinheiro)}</td>
      </tr>
    `
      )
      .join('');

    const formas = Object.entries(caixaRelatorioDiario?.consolidado?.porForma || {})
      .map(([forma, valor]) => `<tr><td>${forma}</td><td style="text-align:right">${formatMoney(valor)}</td></tr>`)
      .join('');

    printHtml(
      'Relatorio Diario de Caixa',
      `
      <h1>Relatorio Diario de Caixa</h1>
      <p><strong>Data:</strong> ${new Date(`${caixaRelatorioDiario?.data || dataRelatorioCaixa}T12:00:00`).toLocaleDateString('pt-BR')}</p>
      <div class="grid">
        <div class="card"><div class="label">Turnos</div><div class="value">${caixaRelatorioDiario?.consolidado?.totalTurnos || 0}</div></div>
        <div class="card"><div class="label">Recebido</div><div class="value">${formatMoney(caixaRelatorioDiario?.consolidado?.totalRecebido)}</div></div>
        <div class="card"><div class="label">Dinheiro</div><div class="value">${formatMoney(caixaRelatorioDiario?.consolidado?.totalDinheiro)}</div></div>
        <div class="card"><div class="label">Sangrias</div><div class="value">${formatMoney(caixaRelatorioDiario?.consolidado?.totalSangrias)}</div></div>
        <div class="card"><div class="label">Suprimentos</div><div class="value">${formatMoney(caixaRelatorioDiario?.consolidado?.totalSuprimentos)}</div></div>
        <div class="card"><div class="label">Diferenca</div><div class="value">${formatMoney(caixaRelatorioDiario?.consolidado?.totalDiferenca)}</div></div>
      </div>
      <h2>Formas de pagamento</h2>
      <table>
        <thead><tr><th>Forma</th><th>Valor</th></tr></thead>
        <tbody>${formas || '<tr><td colspan="2">Sem recebimentos no dia</td></tr>'}</tbody>
      </table>
      <h2 style="margin-top:24px;">Turnos do dia</h2>
      <table>
        <thead>
          <tr>
            <th>Turno</th><th>Abertura</th><th>Fechamento</th><th>Recebido de</th><th>Entregue para</th><th>Assinatura</th><th>Recebido</th><th>Esperado</th><th>Diferenca</th>
          </tr>
        </thead>
        <tbody>${sessoes || '<tr><td colspan="9">Nenhum turno encontrado para esta data</td></tr>'}</tbody>
      </table>
    `
    );
  }

  function exportarCsv() {
    if (!data) return;
    downloadCsv(`financeiro-${datas.inicio}-a-${datas.fim}.csv`, [
      ['Periodo inicial', datas.inicio],
      ['Periodo final', datas.fim],
      ['Receita bruta', data.totalBruto ?? 0],
      ['Comissoes pagas', data.totalComissoes ?? 0],
      ['Despesas fixas', data.totalDespesas ?? 0],
      ['Lucro liquido', data.lucroLiquido ?? 0],
      [],
      ['Servico', 'Valor'],
      ...((data.porServico || []).map((item) => [item.nome, item.valor])),
      [],
      ['Profissional', 'Atendimentos', 'Faturamento bruto', 'Comissao'],
      ...((data.porProfissional || []).map((item) => [item.nome, item.atendimentos, item.bruto, item.comissao])),
    ]);
  }

  const profissionaisExibidos = useMemo(() => {
    const lista = data?.porProfissional || [];
    return showAllProfissionais ? lista : lista.slice(0, 5);
  }, [data?.porProfissional, showAllProfissionais]);

  const dinheiroEsperadoAtual = useMemo(() => {
    if (!caixaAtual) return 0;
    return Number(
      (caixaAtual.fundoInicial || 0) +
        (caixaAtual.resumo?.totalDinheiro || 0) +
        (caixaAtual.resumo?.totalSuprimentos || 0) -
        (caixaAtual.resumo?.totalSangrias || 0)
    );
  }, [caixaAtual]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[rgba(233,155,168,0.22)] border-t-[#e99ba8]" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 pb-16">
      <section className="flex flex-col gap-6 rounded-[34px] border border-white/8 bg-[rgba(28,23,31,0.92)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] lg:flex-row lg:items-start lg:justify-between lg:p-8">
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-[#e99ba8]">
            <DollarSign className="h-4 w-4" />
            Financial intelligence
          </div>
          <div className="space-y-4">
            <h1 className="font-['Playfair_Display'] text-4xl leading-none text-[#faf7f6] sm:text-5xl">
              Saude <span className="text-[#e99ba8]">Financeira</span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[#c7adb4]">
              Receita, comissao, caixa e produtividade em uma leitura unica para a operacao do salao.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-3">
            <Calendar className="h-4 w-4 text-[#f7c1b6]" />
            <input
              type="date"
              value={datas.inicio}
              onChange={(event) => setDatas((prev) => ({ ...prev, inicio: event.target.value }))}
              className="bg-transparent text-sm text-[#faf7f6] outline-none"
            />
            <span className="text-[#806871]">ate</span>
            <input
              type="date"
              value={datas.fim}
              onChange={(event) => setDatas((prev) => ({ ...prev, fim: event.target.value }))}
              className="bg-transparent text-sm text-[#faf7f6] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={exportarCsv}
            disabled={!data}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[rgba(233,155,168,0.14)] px-5 text-[#f7c1b6] transition hover:bg-[rgba(233,155,168,0.22)] disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receita bruta" value={data?.totalBruto} icon={<DollarSign />} tone="rose" />
        <StatCard label="Comissoes" value={data?.totalComissoes} icon={<Users />} tone="gold" />
        <StatCard label="Despesas" value={data?.totalDespesas} icon={<TrendingDown />} tone="ink" />
        <StatCard label="Lucro liquido" value={data?.lucroLiquido} icon={<Wallet />} tone="green" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),420px]">
        <div className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Evolucao do faturamento</h2>
              <p className="mt-2 text-sm text-[#c7adb4]">Historico diario no periodo selecionado.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-[#f7c1b6]" />
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.chartData || []}>
                <defs>
                  <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e99ba8" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#e99ba8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9f848d', fontSize: 10 }}
                  tickFormatter={(value) => value?.split('-')?.reverse()?.slice(0, 2)?.join('/') || ''}
                />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-[18px] border border-white/8 bg-[rgba(28,23,31,0.96)] p-4 shadow-2xl">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9f848d]">{payload[0].payload.date}</p>
                        <p className="mt-2 text-lg font-semibold text-[#faf7f6]">{formatMoney(payload[0].value)}</p>
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="value" stroke="#e99ba8" strokeWidth={3} fill="url(#gradRose)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8">
          <div className="mb-8 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-[#f7c1b6]" />
            <div>
              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Mix de receita</h2>
              <p className="mt-2 text-sm text-[#c7adb4]">Servicos com maior impacto no periodo.</p>
            </div>
          </div>

          <div className="space-y-5">
            {[...(data?.porServico || [])].sort((a, b) => b.valor - a.valor).slice(0, 6).map((item) => (
              <div key={item.nome}>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#faf7f6]">{item.nome}</p>
                  </div>
                  <p className="text-sm text-[#f7c1b6]">{formatMoney(item.valor)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#e99ba8_0%,#f7c1b6_100%)]"
                    style={{ width: `${((item.valor || 0) / Math.max(data?.totalBruto || 1, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => equipeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/8 px-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
          >
            Ver equipe
          </button>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#f7c1b6]" />
            <div>
              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Relatorio diario de caixa</h2>
              <p className="mt-2 text-sm text-[#c7adb4]">Consolidado de turnos e repasses do dia.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={dataRelatorioCaixa}
              onChange={(event) => setDataRelatorioCaixa(event.target.value)}
              className="h-12 rounded-full border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-[#faf7f6] outline-none"
            />
            <button
              type="button"
              onClick={imprimirRelatorioDiario}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/8 px-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniResumo label="Turnos" value={caixaRelatorioDiario?.consolidado?.totalTurnos} plain />
          <MiniResumo label="Recebido" value={caixaRelatorioDiario?.consolidado?.totalRecebido} />
          <MiniResumo label="Dinheiro" value={caixaRelatorioDiario?.consolidado?.totalDinheiro} />
          <MiniResumo label="Sangrias" value={caixaRelatorioDiario?.consolidado?.totalSangrias} />
          <MiniResumo label="Suprimentos" value={caixaRelatorioDiario?.consolidado?.totalSuprimentos} />
          <MiniResumo label="Diferenca" value={caixaRelatorioDiario?.consolidado?.totalDiferenca} highlight />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
        <div className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8">
          <div className="mb-8 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#f7c1b6]" />
            <div>
              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Caixa operacional</h2>
              <p className="mt-2 text-sm text-[#c7adb4]">Abertura, movimento e fechamento do turno.</p>
            </div>
          </div>

          {caixaAtual ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniResumo label="Fundo inicial" value={caixaAtual.fundoInicial} />
                <MiniResumo label="Dinheiro" value={caixaAtual.resumo?.totalDinheiro} />
                <MiniResumo label="Recebido" value={caixaAtual.resumo?.totalRecebido} />
                <MiniResumo label="Esperado" value={dinheiroEsperadoAtual} highlight />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FieldMoney label="Dinheiro contado no caixa" value={dinheiroInformado} onChange={setDinheiroInformado} />
                <FieldText label="Entregue para" value={entregueParaNome} onChange={setEntregueParaNome} placeholder="Ex.: caixa da noite / gerente" />
                <label className="block space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">Assinatura</span>
                  <input
                    value={assinaturaFechamento}
                    onChange={(event) => setAssinaturaFechamento(event.target.value)}
                    className="h-14 w-full rounded-[20px] border border-white/8 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none"
                  />
                </label>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <ArrowLeftRight className="h-4 w-4 text-[#f7c1b6]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e99ba8]">Movimento de caixa</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#c7adb4]">Tipo</span>
                    <select
                      value={movimentoTipo}
                      onChange={(event) => setMovimentoTipo(event.target.value)}
                      className="h-14 w-full rounded-[20px] border border-white/8 bg-[rgba(20,16,22,0.66)] px-5 text-base text-[#faf7f6] outline-none"
                    >
                      <option value="sangria">Sangria</option>
                      <option value="suprimento">Suprimento</option>
                    </select>
                  </label>
                  <FieldMoney label="Valor" value={movimentoValor} onChange={setMovimentoValor} />
                  <FieldText label="Descricao" value={movimentoDescricao} onChange={setMovimentoDescricao} placeholder="Motivo do movimento" />
                </div>

                <button
                  type="button"
                  onClick={handleMovimentoCaixa}
                  disabled={savingCaixa || !canMovimentarCaixa}
                  className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[rgba(233,155,168,0.14)] px-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#f7c1b6] transition hover:bg-[rgba(233,155,168,0.22)] disabled:opacity-60"
                >
                  <PlusCircle className="h-4 w-4" />
                  Registrar movimento
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleFecharCaixa}
                  disabled={savingCaixa || !canFecharCaixa}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#e99ba8_0%,#f7c1b6_100%)] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Fechar caixa
                </button>
                <button
                  type="button"
                  onClick={() => imprimirFechamento({ ...caixaAtual, dinheiroEsperado: dinheiroEsperadoAtual })}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/8 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                >
                  <Printer className="h-4 w-4" />
                  Comprovante
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-dashed border-white/8 bg-[rgba(255,255,255,0.03)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e99ba8]">Nenhum caixa aberto</p>
                <p className="mt-3 text-sm leading-7 text-[#c7adb4]">
                  Abra o turno atual, registre o fundo inicial e indique quem esta recebendo o caixa.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FieldText label="Nome do turno" value={turnoNome} onChange={setTurnoNome} placeholder="Ex.: turno manha" />
                <FieldMoney label="Fundo inicial" value={fundoInicial} onChange={setFundoInicial} />
                <div className="md:col-span-2">
                  <FieldText label="Recebido de" value={recebidoDeNome} onChange={setRecebidoDeNome} placeholder="Ex.: recepcao da abertura / Ana" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAbrirCaixa}
                disabled={savingCaixa || !canAbrirCaixa}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#e99ba8_0%,#f7c1b6_100%)] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#20191f] transition hover:brightness-105 disabled:opacity-60"
              >
                <Clock3 className="h-4 w-4" />
                Abrir caixa
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Receipt className="h-5 w-5 text-[#f7c1b6]" />
              <div>
                <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Historico de turnos</h2>
                <p className="mt-2 text-sm text-[#c7adb4]">Ultimos fechamentos registrados.</p>
              </div>
            </div>

            <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
              {(caixaHistorico || []).map((sessao) => (
                <div key={sessao.id} className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e99ba8]">{sessao.turnoNome}</p>
                      <p className="mt-2 text-sm text-[#faf7f6]">
                        {new Date(sessao.abertoEm).toLocaleDateString('pt-BR')} {new Date(sessao.abertoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                        sessao.status === 'aberto'
                          ? 'border-[rgba(214,160,84,0.28)] bg-[rgba(214,160,84,0.14)] text-[#efcb8e]'
                          : 'border-[rgba(45,111,86,0.28)] bg-[rgba(45,111,86,0.14)] text-[#9be0bb]'
                      )}
                    >
                      {sessao.status === 'aberto' ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniResumo label="Recebido" value={sessao.resumo?.totalRecebido} />
                    <MiniResumo label="Esperado" value={sessao.dinheiroEsperado} />
                    <MiniResumo label="Contado" value={sessao.dinheiroInformado} />
                    <MiniResumo label="Diferenca" value={sessao.diferencaDinheiro} highlight />
                  </div>

                  <button
                    type="button"
                    onClick={() => imprimirFechamento(sessao)}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-white/8 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
                  >
                    <Printer className="h-4 w-4" />
                    Comprovante
                  </button>
                </div>
              ))}

              {!caixaHistorico?.length ? (
                <div className="rounded-[24px] border border-dashed border-white/8 bg-[rgba(255,255,255,0.03)] p-6 text-sm text-[#8f7880]">
                  Nenhum fechamento registrado ainda.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Activity className="h-5 w-5 text-[#f7c1b6]" />
              <div>
                <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Fechamento diario</h2>
                <p className="mt-2 text-sm text-[#c7adb4]">Resumo operacional do dia selecionado.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniResumo label="Atendimentos" value={fechamentoDiario?.resumo?.totalAtendimentos} plain />
              <MiniResumo label="Concluidos" value={fechamentoDiario?.resumo?.concluidos} plain />
              <MiniResumo label="Cancelados" value={fechamentoDiario?.resumo?.cancelados} plain />
              <MiniResumo label="Pend. pagto" value={fechamentoDiario?.resumo?.pendentesPagamento} plain />
              <MiniResumo label="Comissao prev." value={fechamentoDiario?.resumo?.comissaoPrevista} />
              <MiniResumo label="Despesas" value={fechamentoDiario?.resumo?.totalDespesas} />
              <MiniResumo label="Saldo final" value={fechamentoDiario?.resumo?.saldoFinal} highlight />
              <MiniResumo label="Erros" value={fechamentoDiario?.resumo?.errosOperacionais} plain />
            </div>
          </div>
        </div>
      </section>

      <section ref={equipeRef} className="rounded-[32px] border border-white/8 bg-[rgba(41,31,37,0.94)] shadow-[0_24px_60px_rgba(0,0,0,0.24)] overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/8 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#f7c1b6]" />
            <div>
              <h2 className="font-['Playfair_Display'] text-3xl text-[#faf7f6]">Desempenho da equipe</h2>
              <p className="mt-2 text-sm text-[#c7adb4]">Produtividade e comissao por profissional.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAllProfissionais((prev) => !prev)}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/8 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#c7adb4] transition hover:border-[rgba(233,155,168,0.18)] hover:text-[#faf7f6]"
          >
            {showAllProfissionais ? 'Mostrar top 5' : 'Mostrar todos'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/8 text-left">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Profissional</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Atendimentos</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Faturamento</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f848d]">Comissao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {profissionaisExibidos.map((profissional) => (
                <tr key={profissional.id}>
                  <td className="px-6 py-5 text-[#faf7f6]">{profissional.nome}</td>
                  <td className="px-6 py-5 text-[#c7adb4]">{formatPlain(profissional.atendimentos || 0)}</td>
                  <td className="px-6 py-5 text-[#faf7f6]">{formatMoney(profissional.bruto)}</td>
                  <td className="px-6 py-5 text-[#f7c1b6]">{formatMoney(profissional.comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
