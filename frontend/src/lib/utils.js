import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return formatDateInput(date);
}

export function formatDateBR(dateLike) {
  if (!dateLike) return '';
  const date = typeof dateLike === 'string'
    ? new Date(`${dateLike.slice(0, 10)}T12:00:00`)
    : dateLike;

  if (Number.isNaN(date?.getTime?.())) return '';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDurationLabel(totalMinutes = 0) {
  const minutes = Number(totalMinutes) || 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours > 0 && rest > 0) return `${hours}h ${rest}min`;
  if (hours > 0) return `${hours}h`;
  return `${rest}min`;
}

export function getStartOfMonthInput(date = new Date()) {
  return formatDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
}

function isAgendamentoItemDuplicadoBase(agendamento, item) {
  if (!agendamento?.servicoId || !agendamento?.servico || !item?.servicoId) return false;
  if (item.servicoId !== agendamento.servicoId) return false;

  const createdAtAgendamento = agendamento?.createdAt ? new Date(agendamento.createdAt).getTime() : null;
  const createdAtItem = item?.createdAt ? new Date(item.createdAt).getTime() : null;
  const createdTogether = createdAtAgendamento && createdAtItem
    ? Math.abs(createdAtItem - createdAtAgendamento) < 60 * 1000
    : false;

  return createdTogether
    && Number(item.preco || 0) === Number(agendamento.servico?.preco || 0)
    && Number(item.duracaoMin || 0) === Number(agendamento.servico?.duracaoMin || 0);
}

export function getAgendamentoItensExtras(agendamento) {
  return (agendamento?.itens || []).filter((item) => !isAgendamentoItemDuplicadoBase(agendamento, item));
}

export function calculateAgendamentoTotal(agendamento) {
  const precoBase = Number(agendamento?.servico?.preco || agendamento?.pacote?.preco || 0);
  const precoItens = getAgendamentoItensExtras(agendamento).reduce((sum, item) => sum + Number(item.preco || 0), 0);
  const precoProdutos = agendamento?.produtos?.reduce((sum, produto) => {
    return sum + (Number(produto.preco || 0) * Number(produto.quantidade || 0));
  }, 0) || 0;
  return precoBase + precoItens + precoProdutos;
}

export function calculateAgendamentoDuration(agendamento) {
  const duracaoBase = Number(agendamento?.servico?.duracaoMin || agendamento?.pacote?.duracaoMin || 0);
  const duracaoItens = getAgendamentoItensExtras(agendamento).reduce((sum, item) => sum + Number(item.duracaoMin || 0), 0);
  return duracaoBase + duracaoItens;
}

export function downloadCsv(filename, rows) {
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const content = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
