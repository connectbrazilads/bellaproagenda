const prisma = require('../lib/prisma');

function gerarSlots(inicioHora, fimHora, intervaloMin, duracaoMin) {
  const slots = [];
  const [ihH, ihM] = inicioHora.split(':').map(Number);
  const [fhH, fhM] = fimHora.split(':').map(Number);
  const inicioMin = ihH * 60 + ihM;
  const fimMin = fhH * 60 + fhM;

  for (let min = inicioMin; min + duracaoMin <= fimMin; min += intervaloMin) {
    const h = String(Math.floor(min / 60)).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

function horaParaMin(hora) {
  const [h, m] = String(hora || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minParaHora(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
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

function getAgendamentoItensExtras(agendamento) {
  return (agendamento?.itens || []).filter((item) => !isAgendamentoItemDuplicadoBase(agendamento, item));
}

function getFimHoraEfetiva(agendamento) {
  const inicioMin = horaParaMin(agendamento.inicioHora);
  const fimSalvoMin = agendamento.fimHora ? horaParaMin(agendamento.fimHora) : 0;
  const duracaoBase = Number(agendamento?.servico?.duracaoMin || agendamento?.pacote?.duracaoMin || 0);
  const duracaoItens = getAgendamentoItensExtras(agendamento).reduce((sum, item) => sum + Number(item.duracaoMin || 0), 0);
  const fimCalculadoMin = duracaoBase + duracaoItens > 0 ? inicioMin + duracaoBase + duracaoItens : 0;
  const fimEfetivoMin = Math.max(fimSalvoMin, fimCalculadoMin);
  return fimEfetivoMin > inicioMin ? minParaHora(fimEfetivoMin) : agendamento.fimHora;
}

function slotsColidem(slotInicio, duracaoMin, agendInicio, agendFim) {
  const sI = horaParaMin(slotInicio);
  const sF = sI + duracaoMin;
  const aI = horaParaMin(agendInicio);
  const aF = horaParaMin(agendFim);
  if (sI === null || aI === null || aF === null) return false;
  return sI < aF && sF > aI;
}

async function getHorariosDisponiveis(profissionalId, identificador, dataStr, duracaoMinOverride, salaoId) {
  const data = new Date(dataStr + 'T00:00:00');
  const diaSemana = data.getDay();

  let duracaoMin = duracaoMinOverride;
  if (!duracaoMin) {
    const servico = await prisma.servico.findUnique({ where: { id: identificador } });
    if (servico) {
      duracaoMin = servico.duracaoMin;
    } else {
      const pacote = await prisma.pacote.findUnique({ where: { id: identificador } });
      if (!pacote) return [];
      duracaoMin = pacote.duracaoMin;
    }
  }

  // Lógica para "Qualquer Profissional"
  if (profissionalId === 'any' && salaoId) {
    const profissionais = await prisma.profissional.findMany({
      where: { salaoId, ativo: true },
      select: { id: true }
    });

    const promises = profissionais.map(p => getHorariosDisponiveis(p.id, identificador, dataStr, duracaoMin, salaoId));
    const resultados = await Promise.all(promises);
    
    // Une todos os slots e remove duplicados, ordenando por hora
    const todos = [...new Set(resultados.flat())].sort((a, b) => a.localeCompare(b));
    return todos;
  }

  const horario = await prisma.horario.findFirst({ where: { profissionalId, diaSemana } });
  if (!horario) return [];

  const todosSlots = gerarSlots(horario.inicioHora, horario.fimHora, horario.intervaloMin, duracaoMin);

  const inicioDia = new Date(dataStr + 'T00:00:00');
  const fimDia = new Date(dataStr + 'T23:59:59');

  const [agendamentos, bloqueios] = await Promise.all([
    prisma.agendamento.findMany({
      where: { profissionalId, status: { not: 'cancelado' }, data: { gte: inicioDia, lte: fimDia } },
      include: {
        servico: { select: { preco: true, duracaoMin: true } },
        pacote: { select: { duracaoMin: true } },
        itens: { select: { servicoId: true, preco: true, duracaoMin: true, createdAt: true } },
      },
    }),
    prisma.bloqueio.findMany({
      where: { profissionalId, data: { gte: inicioDia, lte: fimDia } },
    }),
  ]);

  const agora = new Date();
  const isHoje = dataStr === agora.toISOString().split('T')[0];

  return todosSlots.filter((slot) => {
    if (isHoje) {
      const [sh, sm] = slot.split(':').map(Number);
      const slotDate = new Date();
      slotDate.setHours(sh, sm, 0, 0);
      if (slotDate <= agora) return false;
    }

    const bloqueado = bloqueios.some((b) => {
      if (!b.inicioHora || !b.fimHora) return true;
      return slotsColidem(slot, duracaoMin, b.inicioHora, b.fimHora);
    });
    if (bloqueado) return false;

    return !agendamentos.some((a) => slotsColidem(slot, duracaoMin, a.inicioHora, getFimHoraEfetiva(a)));
  });
}

module.exports = { getHorariosDisponiveis };
