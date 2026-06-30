import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  PlusCircle,
  Printer,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
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
import {
  getEffectiveActionPermissions,
  getEffectivePermissions,
  readStoredActionPermissions,
  readStoredPermissions,
} from '../../lib/permissions';
import useElementWidth from '../../hooks/useElementWidth';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatPlain(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function getAdiantamentosProfissionais(total) {
  return Number(total?.totalAdiantamentosProfissionais || 0);
}

function getSangriasOperacionais(total) {
  return Math.max(0, Number(total?.totalSangrias || 0) - getAdiantamentosProfissionais(total));
}

function getMovimentoTipoLabel(tipo) {
  if (tipo === 'adiantamento_profissional') return 'Adiantamento profissional';
  if (tipo === 'suprimento') return 'Suprimento';
  if (tipo === 'sangria') return 'Sangria';
  return tipo;
}

const FINANCEIRO_MOBILE_LAYOUT_KEY = 'financeiro_mobile_layout_v1';
const CAIXA_ACTION_PERMISSIONS = [
  'financeiro.caixa.abrir',
  'financeiro.caixa.movimentar',
  'financeiro.caixa.fechar',
];
const FINANCEIRO_MOBILE_MODULES = [
  { id: 'stat-receita', label: 'Receita bruta' },
  { id: 'stat-comissoes', label: 'Comissões' },
  { id: 'stat-despesas', label: 'Despesas' },
  { id: 'stat-lucro', label: 'Lucro líquido' },
  { id: 'chart-faturamento', label: 'Evolução do faturamento' },
  { id: 'mix-receita', label: 'Mix de receita' },
  { id: 'formas-pagamento', label: 'Formas de pagamento' },
  { id: 'relatorio-caixa', label: 'Relatório diário de caixa' },
  { id: 'caixa-operacional', label: 'Caixa operacional' },
  { id: 'historico-turnos', label: 'Histórico de turnos' },
  { id: 'fechamento-diario', label: 'Fechamento diário' },
  { id: 'desempenho-equipe', label: 'Desempenho da equipe' },
];

function buildDefaultFinanceiroMobileLayout() {
  return FINANCEIRO_MOBILE_MODULES.map((item) => ({ ...item, visible: true }));
}

function normalizeFinanceiroMobileLayout(raw) {
  const defaults = buildDefaultFinanceiroMobileLayout();
  if (!Array.isArray(raw)) return defaults;

  const byId = new Map(defaults.map((item) => [item.id, item]));
  const normalized = [];

  raw.forEach((item) => {
    if (!item?.id || !byId.has(item.id)) return;
    const base = byId.get(item.id);
    normalized.push({
      ...base,
      visible: item.visible !== false,
    });
    byId.delete(item.id);
  });

  return normalized.concat([...byId.values()]);
}

function StatCard({ label, value, icon, tone = 'rose', plain = false }) {
  const tones = {
    rose: 'bg-[#d48997]/10 text-[#d48997]',
    gold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    ink: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
          {React.cloneElement(icon, { className: 'h-5 w-5' })}
        </div>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {plain ? formatPlain(value) : formatMoney(value)}
      </p>
    </div>
  );
}

function MiniResumo({ label, value, plain = false, highlight = false }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        highlight
          ? 'border-[#d48997]/20 bg-[#d48997]/5 text-gray-900 dark:text-white'
          : 'border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.01]'
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{plain ? formatPlain(value) : formatMoney(value)}</p>
    </div>
  );
}

function FieldMoney({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <div className="relative">
        <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] pl-9 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all"
          placeholder="0,00"
        />
      </div>
    </div>
  );
}

function FieldText({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[10px] font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10 transition-all placeholder:text-gray-400"
      />
    </div>
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
  const pageRef = useRef(null);
  const [data, setData] = useState(null);
  const [caixaAtual, setCaixaAtual] = useState(null);
  const [caixaHistorico, setCaixaHistorico] = useState([]);
  const [caixaRelatorioDiario, setCaixaRelatorioDiario] = useState(null);
  const [fechamentoDiario, setFechamentoDiario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCaixa, setSavingCaixa] = useState(false);
  const [showAllProfissionais, setShowAllProfissionais] = useState(false);
  const [turnoNome, setTurnoNome] = useState('Turno Manhã');
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
  const [mobileLayout, setMobileLayout] = useState(() => buildDefaultFinanceiroMobileLayout());
  const [mobileLayoutHydrated, setMobileLayoutHydrated] = useState(false);
  const [showMobileLayoutEditor, setShowMobileLayoutEditor] = useState(false);
  const equipeDesktopRef = useRef(null);
  const equipeMobileRef = useRef(null);
  const hydratedLayoutKeyRef = useRef('');
  const pageWidth = useElementWidth(pageRef, typeof window !== 'undefined' ? window.innerWidth : 1440);
  const showDesktopLayout = pageWidth >= 1320;
  const showWideDesktopLayout = pageWidth >= 1500;

  const userId = localStorage.getItem('salao_user_id') || '';
  const role = localStorage.getItem('salao_user_role') || 'gestor';
  const profissionalId = localStorage.getItem('salao_user_pid') || '';
  const permissions = getEffectivePermissions(role, readStoredPermissions());
  const actionPermissions = getEffectiveActionPermissions(role, readStoredActionPermissions());
  const hasFinanceiroAccess = permissions.includes('financeiro');
  const canAbrirCaixa = actionPermissions.includes('financeiro.caixa.abrir');
  const canMovimentarCaixa = actionPermissions.includes('financeiro.caixa.movimentar');
  const canFecharCaixa = actionPermissions.includes('financeiro.caixa.fechar');
  const hasCaixaAccess = CAIXA_ACTION_PERMISSIONS.some((permission) => actionPermissions.includes(permission));
  const canViewFechamentoDiario = hasFinanceiroAccess && actionPermissions.includes('relatorio.fechamento_diario.ver');
  const mobileLayoutStorageKey = `${FINANCEIRO_MOBILE_LAYOUT_KEY}:${userId || role}:${profissionalId || 'all'}`;

  useEffect(() => {
    setMobileLayoutHydrated(false);
    try {
      const raw = localStorage.getItem(mobileLayoutStorageKey);
      setMobileLayout(normalizeFinanceiroMobileLayout(raw ? JSON.parse(raw) : null));
    } catch {
      setMobileLayout(buildDefaultFinanceiroMobileLayout());
    } finally {
      hydratedLayoutKeyRef.current = mobileLayoutStorageKey;
      setMobileLayoutHydrated(true);
    }
  }, [mobileLayoutStorageKey]);

  useEffect(() => {
    if (!mobileLayoutHydrated || hydratedLayoutKeyRef.current !== mobileLayoutStorageKey) return;
    localStorage.setItem(mobileLayoutStorageKey, JSON.stringify(mobileLayout));
  }, [mobileLayout, mobileLayoutHydrated, mobileLayoutStorageKey]);

  useEffect(() => {
    if (showDesktopLayout) {
      setShowMobileLayoutEditor(false);
    }
  }, [showDesktopLayout]);

  useEffect(() => {
    carregar();
  }, [datas, dataRelatorioCaixa]);

  function moveMobileModule(id, direction) {
    setMobileLayout((current) => {
      const next = [...current];
      const index = next.findIndex((item) => item.id === id);
      if (index === -1) return current;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return current;

      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  }

  function toggleMobileModuleVisibility(id) {
    setMobileLayout((current) =>
      current.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
  }

  function resetMobileLayout() {
    setMobileLayout(buildDefaultFinanceiroMobileLayout());
  }

  function scrollToEquipe() {
    const target = showDesktopLayout ? equipeDesktopRef.current : equipeMobileRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function carregar() {
    setLoading(true);
    try {
      const [
        financeiroResponse,
        caixaAtualResponse,
        caixaHistoricoResponse,
        caixaRelatorioResponse,
        fechamentoResponse,
      ] = await Promise.allSettled([
        hasFinanceiroAccess ? getFinanceiro(datas) : Promise.resolve({ data: null }),
        hasCaixaAccess ? getCaixaAtual() : Promise.resolve({ data: null }),
        hasCaixaAccess ? getCaixaSessoes() : Promise.resolve({ data: [] }),
        hasCaixaAccess ? getCaixaRelatorioDiario({ data: dataRelatorioCaixa }) : Promise.resolve({ data: null }),
        canViewFechamentoDiario ? getFechamentoDiario({ data: dataRelatorioCaixa }) : Promise.resolve({ data: null }),
      ]);

      setData(financeiroResponse.status === 'fulfilled' ? financeiroResponse.value?.data || null : null);
      setCaixaAtual(caixaAtualResponse.status === 'fulfilled' ? caixaAtualResponse.value?.data || null : null);
      setCaixaHistorico(caixaHistoricoResponse.status === 'fulfilled' ? caixaHistoricoResponse.value?.data || [] : []);
      setCaixaRelatorioDiario(caixaRelatorioResponse.status === 'fulfilled' ? caixaRelatorioResponse.value?.data || null : null);
      setFechamentoDiario(fechamentoResponse.status === 'fulfilled' ? fechamentoResponse.value?.data || null : null);
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
    const totalSangriasOperacionais = getSangriasOperacionais(sessao?.resumo);
    const totalAdiantamentosProfissionais = getAdiantamentosProfissionais(sessao?.resumo);
    const formas = Object.entries(sessao?.resumo?.porForma || {})
      .map(([forma, valor]) => `<tr><td>${forma}</td><td style="text-align:right">${formatMoney(valor)}</td></tr>`)
      .join('');
    const movimentos = (sessao?.movimentos || [])
      .map(
        (movimento) =>
          `<tr><td>${getMovimentoTipoLabel(movimento.tipo)}</td><td>${movimento.descricao || '-'}</td><td style="text-align:right">${formatMoney(
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
      <p><strong>Sangrias:</strong> ${formatMoney(totalSangriasOperacionais)}</p>
      <p><strong>Adiantamentos a profissionais:</strong> ${formatMoney(totalAdiantamentosProfissionais)}</p>
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
    const consolidado = caixaRelatorioDiario?.consolidado;
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
      'Relatório Diário de Caixa',
      `
      <h1>Relatório Diário de Caixa</h1>
      <p><strong>Data:</strong> ${new Date(`${caixaRelatorioDiario?.data || dataRelatorioCaixa}T12:00:00`).toLocaleDateString('pt-BR')}</p>
      <div class="grid">
        <div class="card"><div class="label">Turnos</div><div class="value">${consolidado?.totalTurnos || 0}</div></div>
        <div class="card"><div class="label">Recebido</div><div class="value">${formatMoney(consolidado?.totalRecebido)}</div></div>
        <div class="card"><div class="label">Dinheiro</div><div class="value">${formatMoney(consolidado?.totalDinheiro)}</div></div>
        <div class="card"><div class="label">Sangrias</div><div class="value">${formatMoney(getSangriasOperacionais(consolidado))}</div></div>
        <div class="card"><div class="label">Adiant. profissionais</div><div class="value">${formatMoney(getAdiantamentosProfissionais(consolidado))}</div></div>
        <div class="card"><div class="label">Suprimentos</div><div class="value">${formatMoney(consolidado?.totalSuprimentos)}</div></div>
        <div class="card"><div class="label">Diferença</div><div class="value">${formatMoney(consolidado?.totalDiferenca)}</div></div>
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
            <th>Turno</th><th>Abertura</th><th>Fechamento</th><th>Recebido de</th><th>Entregue para</th><th>Assinatura</th><th>Recebido</th><th>Esperado</th><th>Diferença</th>
          </tr>
        </thead>
        <tbody>${sessoes || '<tr><td colspan="9">Nenhum turno encontrado para esta data</td></tr>'}</tbody>
      </table>
    `
    );
  }

  function imprimirRelatorioPeriodo() {
    if (!data) return;
    
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const money = (val) => formatter.format(val || 0);

    const periodStr = `${datas.inicio.split('-').reverse().join('/')} a ${datas.fim.split('-').reverse().join('/')}`;

    const formasStr = (data.porForma || []).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.nome}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${money(item.valor)}</td>
      </tr>
    `).join('');

    const servicosStr = [...(data.porServico || [])].sort((a, b) => b.valor - a.valor).slice(0, 10).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.nome}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${money(item.valor)}</td>
      </tr>
    `).join('');

    const equipeStr = (data.porProfissional || []).sort((a,b) => b.bruto - a.bruto).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.nome}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.atendimentos}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${money(item.bruto)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${money(item.comissao)}</td>
      </tr>
    `).join('');

    printHtml(
      'Relatório Financeiro do Período',
      `
      <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
        <h1 style="text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px;">Relatório Comercial</h1>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">Período: ${periodStr}</p>
        
        <h2>Resumo Geral</h2>
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px;">
          <div><strong style="color: #666; display: block; font-size: 12px;">Receita Bruta</strong> <span style="font-size: 18px;">${money(data.totalBruto)}</span></div>
          <div><strong style="color: #666; display: block; font-size: 12px;">Comissões</strong> <span style="font-size: 18px;">${money(data.totalComissoes)}</span></div>
          <div><strong style="color: #666; display: block; font-size: 12px;">Despesas</strong> <span style="font-size: 18px;">${money(data.totalDespesas)}</span></div>
          <div><strong style="color: #666; display: block; font-size: 12px;">Lucro Líquido</strong> <span style="font-size: 18px; color: ${data.lucroLiquido >= 0 ? '#10b981' : '#ef4444'}">${money(data.lucroLiquido)}</span></div>
        </div>

        <div style="display: flex; gap: 30px; margin-bottom: 30px;">
          <div style="flex: 1;">
            <h2>Métricas</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total de Atendimentos</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${data.qtdAgendamentos || 0}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Ticket Médio</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${money(data.ticketMedio)}</td></tr>
            </table>
          </div>
          <div style="flex: 1;">
            <h2>Formas de Pagamento</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${formasStr || '<tr><td colspan="2">Sem dados</td></tr>'}
            </table>
          </div>
        </div>

        <h2>Top Serviços</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
          <thead>
            <tr>
              <th style="padding: 8px; border-bottom: 2px solid #ccc; text-align: left;">Serviço</th>
              <th style="padding: 8px; border-bottom: 2px solid #ccc; text-align: right;">Receita</th>
            </tr>
          </thead>
          <tbody>${servicosStr || '<tr><td colspan="2" style="text-align: center; padding: 10px;">Sem dados</td></tr>'}</tbody>
        </table>

        <h2>Desempenho da Equipe</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
          <thead>
            <tr>
              <th style="padding: 8px; border-bottom: 2px solid #ccc; text-align: left;">Profissional</th>
              <th style="padding: 8px; border-bottom: 2px solid #ccc; text-align: right;">Atendimentos</th>
              <th style="padding: 8px; border-bottom: 2px solid #ccc; text-align: right;">Bruto</th>
              <th style="padding: 8px; border-bottom: 2px solid #ccc; text-align: right;">Comissão</th>
            </tr>
          </thead>
          <tbody>${equipeStr || '<tr><td colspan="4" style="text-align: center; padding: 10px;">Sem dados</td></tr>'}</tbody>
        </table>
      </div>
      `
    );
  }

  function exportarCsv() {
    if (!data) return;
    downloadCsv(`financeiro-${datas.inicio}-a-${datas.fim}.csv`, [
      ['Período inicial', datas.inicio],
      ['Período final', datas.fim],
      ['Receita bruta', data.totalBruto ?? 0],
      ['Comissões pagas', data.totalComissoes ?? 0],
      ['Despesas fixas', data.totalDespesas ?? 0],
      ['Lucro líquido', data.lucroLiquido ?? 0],
      [],
      ['Serviço', 'Valor'],
      ...((data.porServico || []).map((item) => [item.nome, item.valor])),
      [],
      ['Profissional', 'Atendimentos', 'Faturamento bruto', 'Comissão'],
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

  const visibleMobileModules = useMemo(
    () => mobileLayout.filter((item) => item.visible),
    [mobileLayout]
  );
  const mobileEquipeVisible = useMemo(
    () => mobileLayout.some((item) => item.id === 'desempenho-equipe' && item.visible),
    [mobileLayout]
  );

  function renderMobileModule(moduleId) {
    switch (moduleId) {
      case 'stat-receita':
        return <StatCard label="Receita Bruta" value={data?.totalBruto} icon={<DollarSign />} tone="rose" />;
      case 'stat-comissoes':
        return <StatCard label="Comissões" value={data?.totalComissoes} icon={<Users />} tone="gold" />;
      case 'stat-despesas':
        return <StatCard label="Despesas" value={data?.totalDespesas} icon={<TrendingDown />} tone="ink" />;
      case 'stat-lucro':
        return <StatCard label="Lucro Líquido" value={data?.lucroLiquido} icon={<Wallet />} tone="green" />;
      case 'chart-faturamento':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Evolução do Faturamento</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Histórico diário no período selecionado.</p>
              </div>
              <TrendingUp className="h-4 w-4 text-[#d48997]" />
            </div>

            <div className="h-[280px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chartData || []}>
                  <defs>
                    <linearGradient id="gradRoseMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d48997" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#d48997" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#999', fontSize: 10 }}
                    tickFormatter={(value) => value?.split('-')?.reverse()?.slice(0, 2)?.join('/') || ''}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-white dark:bg-[#18181b] p-3 shadow-md">
                          <p className="text-[10px] uppercase font-semibold text-gray-400">{payload[0].payload.date}</p>
                          <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatMoney(payload[0].value)}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="value" stroke="#d48997" strokeWidth={2.5} fill="url(#gradRoseMobile)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'mix-receita':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-[#d48997]" />
              <div>
                <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Mix de Receita</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Serviços com maior impacto no faturamento.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[...(data?.porServico || [])].sort((a, b) => b.valor - a.valor).slice(0, 6).map((item) => (
                <div key={item.nome}>
                  <div className="mb-1.5 flex items-end justify-between gap-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.nome}</p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{formatMoney(item.valor)}</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#d48997]"
                      style={{ width: `${((item.valor || 0) / Math.max(data?.totalBruto || 1, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {mobileEquipeVisible ? (
              <button
                type="button"
                onClick={scrollToEquipe}
                className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Ver Equipe
              </button>
            ) : null}
          </div>
        );
      case 'formas-pagamento':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2.5">
              <Wallet className="h-5 w-5 text-[#d48997]" />
              <div>
                <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Formas de Pagamento</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Receitas por método no período.</p>
              </div>
            </div>
            <div className="space-y-4">
              {[...(data?.porForma || [])].sort((a, b) => b.valor - a.valor).map((item) => (
                <div key={item.nome}>
                  <div className="mb-1.5 flex items-end justify-between gap-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.nome}</p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{formatMoney(item.valor)}</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#d48997]"
                      style={{ width: `${((item.valor || 0) / Math.max(data?.totalBruto || 1, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'relatorio-caixa':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[#d48997]" />
                <div>
                  <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Relatório Diário de Caixa</h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Consolidado de turnos e repasses do dia.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <input
                  type="date"
                  value={dataRelatorioCaixa}
                  onChange={(event) => setDataRelatorioCaixa(event.target.value)}
                  className="h-9 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-xs text-gray-800 dark:text-gray-200 outline-none"
                />
                <button
                  type="button"
                  onClick={imprimirRelatorioDiario}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 grid-cols-2">
              <MiniResumo label="Turnos" value={caixaRelatorioDiario?.consolidado?.totalTurnos} plain />
              <MiniResumo label="Recebido" value={caixaRelatorioDiario?.consolidado?.totalRecebido} />
              <MiniResumo label="Dinheiro" value={caixaRelatorioDiario?.consolidado?.totalDinheiro} />
              <MiniResumo label="Sangrias" value={getSangriasOperacionais(caixaRelatorioDiario?.consolidado)} />
              <MiniResumo label="Adiant. Prof." value={caixaRelatorioDiario?.consolidado?.totalAdiantamentosProfissionais} />
              <MiniResumo label="Suprimentos" value={caixaRelatorioDiario?.consolidado?.totalSuprimentos} />
              <MiniResumo label="Diferença" value={caixaRelatorioDiario?.consolidado?.totalDiferenca} highlight />
            </div>
          </div>
        );
      case 'caixa-operacional':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[#d48997]" />
              <div>
                <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Caixa Operacional</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Abertura, movimento e fechamento do turno.</p>
              </div>
            </div>

            {caixaAtual ? (
              <div className="space-y-5">
                <div className="grid gap-2.5 grid-cols-2">
                  <MiniResumo label="Fundo Inicial" value={caixaAtual.fundoInicial} />
                  <MiniResumo label="Dinheiro" value={caixaAtual.resumo?.totalDinheiro} />
                  <MiniResumo label="Recebido" value={caixaAtual.resumo?.totalRecebido} />
                  <MiniResumo label="Sangrias" value={getSangriasOperacionais(caixaAtual.resumo)} />
                  <MiniResumo label="Adiant. Prof." value={caixaAtual.resumo?.totalAdiantamentosProfissionais} />
                  <MiniResumo label="Esperado" value={dinheiroEsperadoAtual} highlight />
                </div>

                <div className="grid gap-4">
                  <FieldMoney label="Dinheiro Contado no Caixa" value={dinheiroInformado} onChange={setDinheiroInformado} />
                  <FieldText label="Entregue Para" value={entregueParaNome} onChange={setEntregueParaNome} placeholder="Ex: Caixa da noite / Gerente" />
                  <div>
                    <span className="mb-1.5 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Assinatura</span>
                    <input
                      value={assinaturaFechamento}
                      onChange={(event) => setAssinaturaFechamento(event.target.value)}
                      className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-4 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2 focus:ring-[#d48997]/10"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-black/[0.03] dark:border-white/5 pb-2">
                    <ArrowLeftRight className="h-4 w-4 text-[#d48997]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">Lançamento Avulso (Sangria/Suprimento)</span>
                  </div>
                  <div className="grid gap-3.5">
                    <div>
                      <span className="mb-1.5 block text-[10px] font-medium text-gray-400 dark:text-gray-500">Tipo de Lançamento</span>
                      <select
                        value={movimentoTipo}
                        onChange={(event) => setMovimentoTipo(event.target.value)}
                        className="h-11 w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#d48997] focus:ring-2"
                      >
                        <option value="sangria">Sangria (Retirada)</option>
                        <option value="suprimento">Suprimento (Entrada)</option>
                      </select>
                    </div>
                    <FieldMoney label="Valor" value={movimentoValor} onChange={setMovimentoValor} />
                    <FieldText label="Descrição / Motivo" value={movimentoDescricao} onChange={setMovimentoDescricao} placeholder="Ex: Compra de café, troco..." />
                  </div>

                  <button
                    type="button"
                    onClick={handleMovimentoCaixa}
                    disabled={savingCaixa || !canMovimentarCaixa}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#d48997]/10 hover:bg-[#d48997]/20 text-[#d48997] px-4 text-xs font-semibold transition disabled:opacity-50"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Registrar Lançamento
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleFecharCaixa}
                    disabled={savingCaixa || !canFecharCaixa}
                    className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white text-xs font-semibold transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Fechar Turno
                  </button>
                  <button
                    type="button"
                    onClick={() => imprimirFechamento({ ...caixaAtual, dinheiroEsperado: dinheiroEsperadoAtual })}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
                  >
                    <Printer className="h-4 w-4" />
                    Comprovante
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.01] p-5 text-center">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Nenhum Turno Aberto</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                    Abra o caixa informando o turno e o fundo de troco inicial para registrar recebimentos em dinheiro.
                  </p>
                </div>

                <div className="grid gap-3.5">
                  <FieldText label="Nome do Turno" value={turnoNome} onChange={setTurnoNome} placeholder="Ex: Turno Manhã" />
                  <FieldMoney label="Fundo de Troco Inicial" value={fundoInicial} onChange={setFundoInicial} />
                  <FieldText label="Recebido De (Profissional)" value={recebidoDeNome} onChange={setRecebidoDeNome} placeholder="Ex: Recepção Abertura / Ana" />
                </div>

                <button
                  type="button"
                  onClick={handleAbrirCaixa}
                  disabled={savingCaixa || !canAbrirCaixa}
                  className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  <Clock3 className="h-4 w-4" />
                  Abrir Caixa / Iniciar Turno
                </button>
              </div>
            )}
          </div>
        );
      case 'historico-turnos':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <Receipt className="h-5 w-5 text-[#d48997]" />
              <div>
                <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Histórico de Turnos</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Últimos fechamentos registrados.</p>
              </div>
            </div>

            <div className="max-h-[440px] space-y-3.5 overflow-y-auto pr-1 custom-scrollbar">
              {(caixaHistorico || []).map((sessao) => (
                <div key={sessao.id} className="rounded-xl border border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{sessao.turnoNome}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(sessao.abertoEm).toLocaleDateString('pt-BR')} às {new Date(sessao.abertoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                        sessao.status === 'aberto'
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {sessao.status === 'aberto' ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>

                  <div className="grid gap-2 grid-cols-2 text-xs">
                    <MiniResumo label="Recebido" value={sessao.resumo?.totalRecebido} />
                    <MiniResumo label="Sangrias" value={getSangriasOperacionais(sessao.resumo)} />
                    <MiniResumo label="Adiant. Prof." value={sessao.resumo?.totalAdiantamentosProfissionais} />
                    <MiniResumo label="Esperado" value={sessao.dinheiroEsperado} />
                    <MiniResumo label="Contado" value={sessao.dinheiroInformado} />
                    <MiniResumo label="Diferença" value={sessao.diferencaDinheiro} highlight />
                  </div>

                  <button
                    type="button"
                    onClick={() => imprimirFechamento(sessao)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-black/[0.08] dark:border-white/10 px-3 text-[10px] font-semibold text-gray-600 dark:text-gray-400 hover:text-[#d48997] hover:border-[#d48997] transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Comprovante
                  </button>
                </div>
              ))}

              {!caixaHistorico?.length ? (
                <div className="rounded-xl border border-dashed border-black/[0.08] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] p-5 text-center text-xs text-gray-400">
                  Nenhum turno registrado.
                </div>
              ) : null}
            </div>
          </div>
        );
      case 'fechamento-diario':
        return (
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-[#d48997]" />
              <div>
                <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Fechamento Diário</h3>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Resumo operacional do dia selecionado.</p>
              </div>
            </div>
            <div className="grid gap-2.5 grid-cols-2 text-xs">
              <MiniResumo label="Atendimentos" value={fechamentoDiario?.resumo?.totalAtendimentos} plain />
              <MiniResumo label="Concluídos" value={fechamentoDiario?.resumo?.concluidos} plain />
              <MiniResumo label="Cancelados" value={fechamentoDiario?.resumo?.cancelados} plain />
              <MiniResumo label="Pendentes" value={fechamentoDiario?.resumo?.pendentesPagamento} plain />
              <MiniResumo label="Comissão Prev." value={fechamentoDiario?.resumo?.comissaoPrevista} />
              <MiniResumo label="Despesas" value={fechamentoDiario?.resumo?.totalDespesas} />
              <MiniResumo label="Saldo Final" value={fechamentoDiario?.resumo?.saldoFinal} highlight />
              <MiniResumo label="Erros Op." value={fechamentoDiario?.resumo?.errosOperacionais} plain />
            </div>
          </div>
        );
      case 'desempenho-equipe':
        return (
          <section ref={equipeMobileRef} className="overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md shadow-sm">
            <div className="flex flex-col gap-3 border-b border-black/[0.03] dark:border-white/5 p-5">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-[#d48997]" />
                <div>
                  <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Desempenho da Equipe</h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Faturamento e comissão por colaborador.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllProfissionais((prev) => !prev)}
                className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition mt-2"
              >
                {showAllProfissionais ? 'Mostrar Top 5' : 'Mostrar Todos'}
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-black/[0.03] dark:border-white/5 text-left text-gray-400 dark:text-gray-500">
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">Profissional</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-center">Qtd</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Faturamento</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/5">
                  {profissionaisExibidos.map((profissional) => (
                    <tr key={profissional.id} className="text-gray-700 dark:text-gray-300 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">{profissional.nome}</td>
                      <td className="px-5 py-3.5 text-center">{formatPlain(profissional.atendimentos || 0)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-905 dark:text-zinc-200">{formatMoney(profissional.bruto)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#d48997]">{formatMoney(profissional.comissao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d48997]/20 border-t-[#d48997]" />
      </div>
    );
  }

  if (!hasFinanceiroAccess && hasCaixaAccess) {
    return (
      <div ref={pageRef} className="mx-auto flex max-w-5xl flex-col gap-6 pb-20 px-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
          <div className="flex items-center gap-2 text-[#d48997]">
            <DollarSign className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Terminal Financeiro</span>
          </div>
          <div className="space-y-2">
            <h1 className="font-serif font-normal text-2xl sm:text-3xl text-gray-900 dark:text-white">
              Operação de <span className="text-[#d48997]">Caixa</span>
            </h1>
            <p className="max-w-xl text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Este terminal operacional permite abrir turnos, realizar sangrias/suprimentos e fechar caixas no dia de hoje.
            </p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          {renderMobileModule('caixa-operacional')}
          <div className="space-y-6">
            {renderMobileModule('relatorio-caixa')}
            {renderMobileModule('historico-turnos')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={pageRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-8 pb-20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-black/[0.03] dark:border-white/[0.03] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <DollarSign className="h-4 w-4 text-[#d48997]" />
            <span className="text-[10px] font-semibold text-[#d48997] tracking-wide">Inteligência Financeira</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-gray-900 dark:text-white tracking-wide leading-tight mb-2">
            Saúde <span className="text-[#d48997]">Financeira</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed max-w-xl">
            Acompanhe a receita bruta, custos de repasse, fluxo do caixa operacional e produtividade financeira de toda a equipe.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {!showDesktopLayout && (
            <button
              type="button"
              onClick={() => setShowMobileLayoutEditor(true)}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <SlidersHorizontal className="h-4 w-4" /> Personalizar
            </button>
          )}
          
          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3.5 py-1.5 text-xs text-gray-800 dark:text-gray-200">
            <Calendar className="h-4 w-4 text-[#d48997]" />
            <input
              type="date"
              value={datas.inicio}
              onChange={(event) => setDatas((prev) => ({ ...prev, inicio: event.target.value }))}
              className="bg-transparent outline-none w-[110px]"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={datas.fim}
              onChange={(event) => setDatas((prev) => ({ ...prev, fim: event.target.value }))}
              className="bg-transparent outline-none w-[110px]"
            />
          </div>

          <button
            type="button"
            onClick={imprimirRelatorioPeriodo}
            disabled={!data}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#d48997]/10 hover:bg-[#d48997]/20 text-[#d48997] transition disabled:opacity-50"
            title="Imprimir Relatório"
          >
            <Printer className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={exportarCsv}
            disabled={!data}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#d48997]/10 hover:bg-[#d48997]/20 text-[#d48997] transition disabled:opacity-50"
            title="Exportar CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Customizer Modal */}
      <AnimatePresence>
        {showMobileLayoutEditor && !showDesktopLayout && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileLayoutEditor(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#18181b] shadow-xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/5 px-6 py-4">
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#d48997]">Painel Mobile</span>
                  <h3 className="mt-0.5 font-serif text-base font-normal text-gray-900 dark:text-white">Personalizar Seções</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileLayoutEditor(false)}
                  className="rounded-full border border-black/[0.04] dark:border-white/10 p-2 text-gray-400 hover:text-red-500 transition shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-4 space-y-3.5 flex-1 custom-scrollbar">
                {mobileLayout.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5 text-xs',
                      item.visible
                        ? 'border-black/[0.04] dark:border-white/5 bg-white dark:bg-zinc-800/20 shadow-sm'
                        : 'border-black/[0.02] dark:border-white/[0.01] bg-gray-50/50 dark:bg-zinc-900/10 opacity-60'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleMobileModuleVisibility(item.id)}
                      className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition',
                        item.visible
                          ? 'border-[#d48997]/20 bg-[#d48997]/5 text-[#d48997]'
                          : 'border-black/[0.08] dark:border-white/10 text-gray-400'
                      )}
                    >
                      {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{item.visible ? 'Ativado no painel' : 'Escondido'}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveMobileModule(item.id, 'up')}
                        disabled={index === 0}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/10 text-gray-400 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMobileModule(item.id, 'down')}
                        disabled={index === mobileLayout.length - 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/10 text-gray-400 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] px-6 py-4">
                <button
                  type="button"
                  onClick={resetMobileLayout}
                  className="h-9 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-250 transition"
                >
                  Restaurar Padrão
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileLayoutEditor(false)}
                  className="h-9 rounded-xl bg-[#d48997] hover:bg-[#c97b8a] px-5 text-xs font-semibold text-white transition shadow-sm"
                >
                  Aplicar Layout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Render */}
      {!showDesktopLayout ? (
        <div className="space-y-6">
          {visibleMobileModules.length ? (
            visibleMobileModules.map((item) => <div key={item.id}>{renderMobileModule(item.id)}</div>)
          ) : (
            <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/10 bg-white/40 dark:bg-white/[0.01] p-6 text-center text-xs">
              <p className="font-semibold text-gray-800 dark:text-gray-200">Nenhum bloco visível no celular.</p>
              <p className="mt-1 text-gray-400 dark:text-gray-500 max-w-xs mx-auto leading-relaxed">Personalize a exibição dos módulos usando o botão no topo do painel.</p>
              <button
                type="button"
                onClick={() => setShowMobileLayoutEditor(true)}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-[#d48997]/15 text-[#d48997] px-4 font-semibold hover:bg-[#d48997]/25 transition"
              >
                Ajustar Módulos
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Executive Stats Row */}
          <div className={cn('grid gap-4 md:grid-cols-2', showWideDesktopLayout ? 'xl:grid-cols-4' : 'xl:grid-cols-2')}>
            <StatCard label="Receita Bruta" value={data?.totalBruto} icon={<DollarSign />} tone="rose" />
            <StatCard label="Comissões Pagas" value={data?.totalComissoes} icon={<Users />} tone="gold" />
            <StatCard label="Despesas Fixas" value={data?.totalDespesas} icon={<TrendingDown />} tone="ink" />
            <StatCard label="Lucro Líquido" value={data?.lucroLiquido} icon={<Wallet />} tone="green" />
          </div>

          {/* Faturamento Chart & Mix Grid */}
          <div className={cn('grid gap-6', showWideDesktopLayout && 'xl:grid-cols-[1fr,360px]')}>
            <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Evolução do Faturamento</h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Histórico diário de faturamento bruto.</p>
                </div>
                <TrendingUp className="h-4 w-4 text-[#d48997]" />
              </div>

              <div className="h-[280px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chartData || []}>
                    <defs>
                      <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d48997" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#d48997" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#999', fontSize: 10 }}
                      tickFormatter={(value) => value?.split('-')?.reverse()?.slice(0, 2)?.join('/') || ''}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded-xl border border-black/[0.04] dark:border-white/10 bg-white dark:bg-[#18181b] p-3 shadow-md">
                            <p className="text-[10px] uppercase font-semibold text-gray-400">{payload[0].payload.date}</p>
                            <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{formatMoney(payload[0].value)}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="value" stroke="#d48997" strokeWidth={2.5} fill="url(#gradRose)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2.5">
                  <BarChart3 className="h-5 w-5 text-[#d48997]" />
                  <div>
                    <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Mix de Receita</h3>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Serviços que geram mais receita.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[...(data?.porServico || [])].sort((a, b) => b.valor - a.valor).slice(0, 6).map((item) => (
                    <div key={item.nome}>
                      <div className="mb-1.5 flex items-end justify-between gap-4 text-xs">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{item.nome}</p>
                        <p className="font-semibold text-gray-900 dark:text-white shrink-0">{formatMoney(item.valor)}</p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#d48997]"
                          style={{ width: `${((item.valor || 0) / Math.max(data?.totalBruto || 1, 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={scrollToEquipe}
                  className="mt-6 inline-flex h-9 w-full items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-zinc-250 transition"
                >
                  Ver Desempenho Equipe
                </button>
              </div>

              <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2.5">
                  <Wallet className="h-5 w-5 text-[#d48997]" />
                  <div>
                    <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Formas de Pagamento</h3>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Receitas por método no período.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[...(data?.porForma || [])].sort((a, b) => b.valor - a.valor).map((item) => (
                    <div key={item.nome}>
                      <div className="mb-1.5 flex items-end justify-between gap-4 text-xs">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{item.nome}</p>
                        <p className="font-semibold text-gray-900 dark:text-white shrink-0">{formatMoney(item.valor)}</p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#d48997]"
                          style={{ width: `${((item.valor || 0) / Math.max(data?.totalBruto || 1, 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Consolidado Diario Card */}
          <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[#d48997]" />
                <div>
                  <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Relatório Diário de Caixa</h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Acompanhamento do fechamento de turnos.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <input
                  type="date"
                  value={dataRelatorioCaixa}
                  onChange={(event) => setDataRelatorioCaixa(event.target.value)}
                  className="h-9 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#111113] px-3 text-xs text-gray-800 dark:text-gray-200 outline-none"
                />
                <button
                  type="button"
                  onClick={imprimirRelatorioDiario}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </button>
              </div>
            </div>

            <div className={cn('grid gap-3 md:grid-cols-3', showWideDesktopLayout ? 'xl:grid-cols-7' : 'xl:grid-cols-4')}>
              <MiniResumo label="Turnos" value={caixaRelatorioDiario?.consolidado?.totalTurnos} plain />
              <MiniResumo label="Recebido" value={caixaRelatorioDiario?.consolidado?.totalRecebido} />
              <MiniResumo label="Dinheiro" value={caixaRelatorioDiario?.consolidado?.totalDinheiro} />
              <MiniResumo label="Sangrias" value={getSangriasOperacionais(caixaRelatorioDiario?.consolidado)} />
              <MiniResumo label="Adiant. Prof." value={caixaRelatorioDiario?.consolidado?.totalAdiantamentosProfissionais} />
              <MiniResumo label="Suprimentos" value={caixaRelatorioDiario?.consolidado?.totalSuprimentos} />
              <MiniResumo label="Diferença" value={caixaRelatorioDiario?.consolidado?.totalDiferenca} highlight />
            </div>
          </div>

          {/* Operational Caixa & History row */}
          <div className={cn('grid gap-6', showWideDesktopLayout && 'xl:grid-cols-[1.15fr,0.85fr]')}>
            {renderMobileModule('caixa-operacional')}
            
            <div className="space-y-6">
              {renderMobileModule('historico-turnos')}
              {renderMobileModule('fechamento-diario')}
            </div>
          </div>

          {/* Equipe Table card */}
          <section ref={equipeDesktopRef} className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-white/[0.02] backdrop-blur-md shadow-sm overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-black/[0.03] dark:border-white/5 p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-[#d48997]" />
                <div>
                  <h3 className="font-serif text-lg font-normal text-gray-900 dark:text-white">Desempenho da Equipe</h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Colaboradores com maior volume e repasse financeiro.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllProfissionais((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/10 px-4 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#d48997] hover:border-[#d48997] transition"
              >
                {showAllProfissionais ? 'Mostrar Top 5' : 'Mostrar Todos'}
              </button>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-black/[0.03] dark:border-white/5 text-left text-gray-400 dark:text-gray-500">
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Profissional</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Atendimentos</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Faturamento Bruto</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Comissão Gerada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/5">
                  {profissionaisExibidos.map((p) => (
                    <tr key={p.id} className="text-gray-700 dark:text-gray-300 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.nome}</td>
                      <td className="px-6 py-4 text-center">{formatPlain(p.atendimentos || 0)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-zinc-200">{formatMoney(p.bruto)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-[#d48997]">{formatMoney(p.comissao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </motion.div>
  );
}
