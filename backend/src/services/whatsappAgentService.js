const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../lib/prisma');
const { getHorariosDisponiveis } = require('./slotsService');

const MAX_HISTORY = 40;

const ferramentas = [
  {
    functionDeclarations: [
      {
        name: 'listar_servicos',
        description: 'Lista todos os serviços e pacotes disponíveis no salão com IDs, preços e duração em minutos',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'listar_profissionais',
        description: 'Lista profissionais disponíveis, opcionalmente filtrados por serviço',
        parameters: {
          type: 'object',
          properties: {
            servicoId: { type: 'string', description: 'ID do serviço para filtrar (opcional)' },
          },
        },
      },
      {
        name: 'verificar_horarios',
        description: 'Verifica horários disponíveis para um profissional em uma data específica',
        parameters: {
          type: 'object',
          properties: {
            profissionalId: { type: 'string', description: 'ID do profissional' },
            servicoId: { type: 'string', description: 'ID do serviço (use servicoId OU pacoteId)' },
            pacoteId: { type: 'string', description: 'ID do pacote (use servicoId OU pacoteId)' },
            data: { type: 'string', description: 'Data no formato yyyy-mm-dd' },
          },
          required: ['profissionalId', 'data'],
        },
      },
      {
        name: 'criar_agendamento',
        description: 'Cria um novo agendamento para o cliente após confirmação de todos os dados',
        parameters: {
          type: 'object',
          properties: {
            profissionalId: { type: 'string', description: 'ID do profissional' },
            servicoId: { type: 'string', description: 'ID do serviço (use servicoId OU pacoteId)' },
            pacoteId: { type: 'string', description: 'ID do pacote (use servicoId OU pacoteId)' },
            clienteNome: { type: 'string', description: 'Nome completo do cliente' },
            clienteTelefone: { type: 'string', description: 'Telefone do cliente com DDD' },
            data: { type: 'string', description: 'Data no formato yyyy-mm-dd' },
            hora: { type: 'string', description: 'Horário no formato HH:MM' },
            observacao: { type: 'string', description: 'Observação opcional' },
          },
          required: ['profissionalId', 'clienteNome', 'clienteTelefone', 'data', 'hora'],
        },
      },
      {
        name: 'consultar_agendamentos',
        description: 'Consulta agendamentos futuros do cliente pelo telefone',
        parameters: {
          type: 'object',
          properties: {
            telefone: { type: 'string', description: 'Telefone do cliente' },
          },
          required: ['telefone'],
        },
      },
      {
        name: 'cancelar_agendamento',
        description: 'Cancela um agendamento existente pelo ID',
        parameters: {
          type: 'object',
          properties: {
            agendamentoId: { type: 'string', description: 'ID do agendamento' },
          },
          required: ['agendamentoId'],
        },
      },
    ],
  },
];

async function executarFerramenta(nome, args, salaoId) {
  switch (nome) {
    case 'listar_servicos': {
      const [servicos, pacotes] = await Promise.all([
        prisma.servico.findMany({
          where: { salaoId, ativo: true },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, preco: true, duracaoMin: true },
        }),
        prisma.pacote.findMany({
          where: { salaoId, ativo: true },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, preco: true, duracaoMin: true },
        }),
      ]);
      return { servicos, pacotes };
    }

    case 'listar_profissionais': {
      const { servicoId } = args;
      if (servicoId) {
        const vinculos = await prisma.profissionalServico.findMany({
          where: { servicoId },
          include: { profissional: { select: { id: true, nome: true, ativo: true, salaoId: true } } },
        });
        return vinculos
          .filter((v) => v.profissional.ativo && v.profissional.salaoId === salaoId)
          .map((v) => ({ id: v.profissional.id, nome: v.profissional.nome }));
      }
      return prisma.profissional.findMany({
        where: { salaoId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      });
    }

    case 'verificar_horarios': {
      const { profissionalId, servicoId, pacoteId, data } = args;
      const identificador = servicoId || pacoteId;
      if (!identificador) return { erro: 'Informe servicoId ou pacoteId' };
      const slots = await getHorariosDisponiveis(profissionalId, identificador, data);
      return { data, horarios: slots.length ? slots : 'Nenhum horário disponível nesta data' };
    }

    case 'criar_agendamento': {
      const { profissionalId, servicoId, pacoteId, clienteNome, clienteTelefone, data, hora, observacao } = args;

      let duracaoMin, nomeItem;
      if (pacoteId) {
        const pacote = await prisma.pacote.findFirst({ where: { id: pacoteId, salaoId } });
        if (!pacote) return { erro: 'Pacote não encontrado' };
        duracaoMin = pacote.duracaoMin;
        nomeItem = pacote.nome;
      } else if (servicoId) {
        const servico = await prisma.servico.findFirst({ where: { id: servicoId, salaoId } });
        if (!servico) return { erro: 'Serviço não encontrado' };
        duracaoMin = servico.duracaoMin;
        nomeItem = servico.nome;
      } else {
        return { erro: 'Informe servicoId ou pacoteId' };
      }

      const slots = await getHorariosDisponiveis(profissionalId, servicoId || pacoteId, data, duracaoMin);
      if (!slots.includes(hora)) {
        return { erro: 'Horário não disponível', horariosDisponiveis: slots };
      }

      const [hh, mm] = hora.split(':').map(Number);
      const fimMin = hh * 60 + mm + duracaoMin;
      const fimHora = `${String(Math.floor(fimMin / 60)).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`;

      const ag = await prisma.agendamento.create({
        data: {
          salaoId,
          profissionalId,
          servicoId: servicoId || null,
          pacoteId: pacoteId || null,
          clienteNome,
          clienteTelefone,
          data: new Date(data + 'T00:00:00'),
          inicioHora: hora,
          fimHora,
          observacao,
        },
        include: { profissional: { select: { nome: true } } },
      });

      return {
        sucesso: true,
        agendamentoId: ag.id,
        servico: nomeItem,
        profissional: ag.profissional.nome,
        data,
        hora,
      };
    }

    case 'consultar_agendamentos': {
      const { telefone } = args;
      const numero = telefone.replace(/\D/g, '');
      const sufixo = numero.slice(-9);
      const agendamentos = await prisma.agendamento.findMany({
        where: {
          salaoId,
          clienteTelefone: { endsWith: sufixo },
          status: { not: 'cancelado' },
          data: { gte: new Date() },
        },
        orderBy: { data: 'asc' },
        take: 10,
        include: {
          servico: { select: { nome: true } },
          pacote: { select: { nome: true } },
          profissional: { select: { nome: true } },
        },
      });

      if (!agendamentos.length) return { agendamentos: [], mensagem: 'Nenhum agendamento futuro encontrado' };

      return {
        agendamentos: agendamentos.map((a) => ({
          id: a.id,
          servico: a.servico?.nome || a.pacote?.nome,
          profissional: a.profissional.nome,
          data: a.data.toISOString().split('T')[0],
          hora: a.inicioHora,
          status: a.status,
        })),
      };
    }

    case 'cancelar_agendamento': {
      const { agendamentoId } = args;
      const ag = await prisma.agendamento.findFirst({ where: { id: agendamentoId, salaoId } });
      if (!ag) return { erro: 'Agendamento não encontrado' };
      if (ag.status === 'cancelado') return { erro: 'Agendamento já cancelado' };
      await prisma.agendamento.update({ where: { id: agendamentoId }, data: { status: 'cancelado' } });
      return { sucesso: true };
    }

    default:
      return { erro: `Ferramenta desconhecida: ${nome}` };
  }
}

async function processarMensagem(salaoId, telefone, mensagem) {
  const salao = await prisma.salao.findUnique({ where: { id: salaoId } });
  if (!salao?.moduloIA || !process.env.GEMINI_API_KEY) {
    return null;
  }
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });

  const baseConhecimento = [
    salao?.infoFaq ? `FAQ:\n${salao.infoFaq}` : '',
    salao?.infoPoliticas ? `Políticas:\n${salao.infoPoliticas}` : '',
    salao?.infoPromocoes ? `Promoções:\n${salao.infoPromocoes}` : '',
    salao?.infoRegras ? `Regras:\n${salao.infoRegras}` : '',
  ].filter(Boolean).join('\n\n');

  const systemInstruction =
    `Você é um assistente de agendamento do ${salao?.nome || 'Salão'}. Ajude os clientes a marcar, remarcar e cancelar horários de forma simpática.

Data de hoje: ${hoje}
Telefone do cliente: ${telefone}

Instruções:
- Use linguagem amigável e concisa
- Datas com o cliente: formato dd/mm/yyyy
- Nas ferramentas: sempre yyyy-mm-dd e HH:MM
- Antes de criar um agendamento, confirme serviço, profissional, data, horário e nome
- Use o telefone já conhecido do cliente ao criar agendamentos
- Se horário indisponível, ofereça os disponíveis
- Para cancelar, liste os agendamentos primeiro${baseConhecimento ? `\n\n${baseConhecimento}` : ''}`;

  const conversa = await prisma.conversa.findUnique({ where: { salaoId_telefone: { salaoId, telefone } } });
  let historico = Array.isArray(conversa?.historico) ? conversa.historico : [];

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction,
    tools: ferramentas,
  });

  const chat = model.startChat({ history: historico });

  let result = await chat.sendMessage(mensagem);

  // Loop to resolve all tool calls
  for (let i = 0; i < 10; i++) {
    const calls = result.response.functionCalls();
    if (!calls || calls.length === 0) break;

    const parts = [];
    for (const call of calls) {
      const output = await executarFerramenta(call.name, call.args, salaoId);
      parts.push({ functionResponse: { name: call.name, response: { output } } });
    }
    result = await chat.sendMessage(parts);
  }

  const texto = result.response.text();

  // Save updated history (trimmed)
  const novoHistorico = (await chat.getHistory()).slice(-MAX_HISTORY);
  await prisma.conversa.upsert({
    where: { salaoId_telefone: { salaoId, telefone } },
    update: { historico: novoHistorico },
    create: { salaoId, telefone, historico: novoHistorico },
  });

  return texto;
}

module.exports = { processarMensagem };
