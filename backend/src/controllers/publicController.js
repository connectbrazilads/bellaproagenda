const prisma = require('../lib/prisma');
const { getHorariosDisponiveis } = require('../services/slotsService');
const { notificarClienteAgendamento, notificarSalaoNovoAgendamento } = require('../services/whatsappService');
const {
  getServicoIdsDoPacote,
  profissionalAtendeTodosServicos,
} = require('../lib/profissionalServicoValidation');

async function findSalao(slug) {
  return await prisma.salao.findUnique({ where: { slug } });
}

async function getSalao(req, res) {
  const { slug } = req.params;
  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salão não encontrado' });
  res.json(salao);
}

async function getServicos(req, res) {
  const { slug } = req.params;
  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salão não encontrado' });

  const servicos = await prisma.servico.findMany({
    where: { salaoId: salao.id, ativo: true },
    orderBy: { nome: 'asc' },
  });
  res.json(servicos);
}

async function getPacotesPublicos(req, res) {
  const { slug } = req.params;
  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salão não encontrado' });

  const pacotes = await prisma.pacote.findMany({
    where: { salaoId: salao.id, ativo: true },
    orderBy: { nome: 'asc' },
    include: {
      servicos: { include: { servico: { select: { nome: true } } } },
    },
  });
  res.json(pacotes);
}

async function getProfissionaisPublicos(req, res) {
  const { slug } = req.params;
  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salão não encontrado' });

  const profissionais = await prisma.profissional.findMany({
    where: { salaoId: salao.id, ativo: true },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      fotoUrl: true,
      bio: true,
      categorias: {
        select: {
          categoriaId: true,
          categoria: {
            select: { id: true, nome: true },
          },
        },
      },
    },
    take: 6,
  });

  res.json(profissionais);
}

async function getProfissionaisPorServico(req, res) {
  const { slug, servicoId } = req.params;
  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salão não encontrado' });

  const vinculos = await prisma.profissionalServico.findMany({
    where: { 
      servicoId,
      servico: { salaoId: salao.id }
    },
    include: {
      profissional: {
        select: {
          id: true,
          nome: true,
          fotoUrl: true,
          bio: true,
          ativo: true,
          categorias: {
            select: {
              categoria: {
                select: { id: true, nome: true },
              },
            },
          },
        },
      },
    },
  });
  const profissionais = vinculos
    .map((v) => v.profissional)
    .filter((p) => p && p.ativo);
  res.json(profissionais);
}

async function getProfissionaisPorPacote(req, res) {
  const { slug, pacoteId } = req.params;
  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'SalÃ£o nÃ£o encontrado' });

  const servicoIdsDoPacote = await getServicoIdsDoPacote(pacoteId, salao.id);
  if (!servicoIdsDoPacote) return res.status(404).json({ error: 'Pacote nÃ£o encontrado' });

  const profissionais = await prisma.profissional.findMany({
    where: { salaoId: salao.id, ativo: true },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      fotoUrl: true,
      bio: true,
      ativo: true,
      categorias: {
        select: {
          categoria: {
            select: { id: true, nome: true },
          },
        },
      },
      servicos: { select: { servicoId: true } },
    },
  });

  const compativeis = profissionais
    .filter((profissional) => {
      const ids = new Set(profissional.servicos.map((item) => item.servicoId));
      return servicoIdsDoPacote.every((servicoId) => ids.has(servicoId));
    })
    .map(({ servicos, ...profissional }) => profissional);

  res.json(compativeis);
}

function normalizarIdsServico(servicoId, servicoIds) {
  if (servicoIds) return Array.isArray(servicoIds) ? servicoIds : [servicoIds];
  if (servicoId) return [servicoId];
  return [];
}

async function resolverDuracaoConsulta(slug, { profissionalId, servicoId, servicoIds, pacoteId }) {
  if (!profissionalId || (!servicoId && !pacoteId && !servicoIds)) {
    return { erro: 'profissionalId, (servicoId/servicoIds ou pacoteId) sao obrigatorios', status: 400 };
  }

  const salao = await findSalao(slug);
  if (!salao) return { erro: 'Salao nao encontrado', status: 404 };

  let duracaoMin = 0;
  const sIds = normalizarIdsServico(servicoId, servicoIds);

  if (pacoteId) {
    const pacote = await prisma.pacote.findUnique({ where: { id: pacoteId } });
    duracaoMin = pacote?.duracaoMin || 0;
    const servicoIdsDoPacote = await getServicoIdsDoPacote(pacoteId, salao.id);
    if (!servicoIdsDoPacote) return { erro: 'Pacote nao encontrado', status: 404 };

    const profissionalCompativelPacote = await profissionalAtendeTodosServicos(profissionalId, servicoIdsDoPacote, salao.id);
    if (!profissionalCompativelPacote) {
      return { erro: 'O profissional selecionado nao atende todos os servicos deste pacote', status: 400 };
    }
  } else {
    const servicos = await prisma.servico.findMany({ where: { id: { in: sIds }, salaoId: salao.id } });
    duracaoMin = servicos.reduce((acc, s) => acc + s.duracaoMin, 0);
    const profissionalCompativelServicos = await profissionalAtendeTodosServicos(profissionalId, sIds, salao.id);
    if (!profissionalCompativelServicos) {
      console.log(`[Agendamento] Profissional ${profissionalId} nao atende oficialmente todos os servicos escolhidos, mas prosseguindo por flexibilidade.`);
    }
  }

  if (duracaoMin === 0) {
    return { erro: 'Duracao invalida ou servicos nao encontrados', status: 400 };
  }

  return { salao, duracaoMin };
}

async function getDatasDisponiveisHandler(req, res) {
  const { profissionalId, servicoId, servicoIds, pacoteId, ano, mes } = req.query;
  const anoNum = Number(ano);
  const mesNum = Number(mes);

  if (!anoNum || !mesNum || mesNum < 1 || mesNum > 12) {
    return res.status(400).json({ error: 'ano e mes validos sao obrigatorios' });
  }

  const consulta = await resolverDuracaoConsulta(req.params.slug, { profissionalId, servicoId, servicoIds, pacoteId });
  if (consulta.erro) {
    return res.status(consulta.status).json({ error: consulta.erro });
  }

  const { salao, duracaoMin } = consulta;
  const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const checks = Array.from({ length: ultimoDia }, (_, idx) => idx + 1).map(async (dia) => {
    const dataStr = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const data = new Date(`${dataStr}T00:00:00`);
    if (data < hoje) return null;

    const slots = await getHorariosDisponiveis(profissionalId, null, dataStr, duracaoMin, salao.id);
    return slots.length > 0 ? dataStr : null;
  });

  const datas = (await Promise.all(checks)).filter(Boolean);
  res.json(datas);
}

async function getHorariosDisponiveisHandler(req, res) {
  const { profissionalId, servicoId, servicoIds, pacoteId, data } = req.query;
  if (!profissionalId || (!servicoId && !pacoteId && !servicoIds) || !data) {
    return res.status(400).json({ error: 'profissionalId, (servicoId/servicoIds ou pacoteId) e data são obrigatórios' });
  }

  const salao = await findSalao(req.params.slug);
  if (!salao) return res.status(404).json({ error: 'SalÃ£o nÃ£o encontrado' });

  let duracaoMin = 0;
  const sIds = servicoIds ? (Array.isArray(servicoIds) ? servicoIds : [servicoIds]) : (servicoId ? [servicoId] : []);

  if (pacoteId) {
    const pacote = await prisma.pacote.findUnique({ where: { id: pacoteId } });
    duracaoMin = pacote?.duracaoMin || 0;
    const servicoIdsDoPacote = await getServicoIdsDoPacote(pacoteId, salao.id);
    if (!servicoIdsDoPacote) return res.status(404).json({ error: 'Pacote nÃ£o encontrado' });
    const profissionalCompativelPacote = await profissionalAtendeTodosServicos(profissionalId, servicoIdsDoPacote, salao.id);
    if (!profissionalCompativelPacote) {
      return res.status(400).json({ error: 'O profissional selecionado nÃ£o atende todos os serviÃ§os deste pacote' });
    }
  } else {
    const servicos = await prisma.servico.findMany({ where: { id: { in: sIds }, salaoId: salao.id } });
    duracaoMin = servicos.reduce((acc, s) => acc + s.duracaoMin, 0);
    const profissionalCompativelServicos = await profissionalAtendeTodosServicos(profissionalId, sIds, salao.id);
    if (!profissionalCompativelServicos) {
      console.log(`[Agendamento] Profissional ${profissionalId} não atende oficialmente todos os serviços escolhidos, mas prosseguindo por flexibilidade.`);
    }
  }

  if (duracaoMin === 0) return res.status(400).json({ error: 'Duração inválida ou serviços não encontrados' });

  const slots = await getHorariosDisponiveis(profissionalId, null, data, duracaoMin, salao.id);
  res.json(slots);
}

async function getHorariosDisponiveisHandlerPublic(req, res) {
  const { profissionalId, servicoId, servicoIds, pacoteId, data } = req.query;
  if (!data) {
    return res.status(400).json({ error: 'data e obrigatoria' });
  }

  const consulta = await resolverDuracaoConsulta(req.params.slug, { profissionalId, servicoId, servicoIds, pacoteId });
  if (consulta.erro) {
    return res.status(consulta.status).json({ error: consulta.erro });
  }

  const { salao, duracaoMin } = consulta;
  const slots = await getHorariosDisponiveis(profissionalId, null, data, duracaoMin, salao.id);
  res.json(slots);
}

async function criarAgendamento(req, res) {
  const { slug } = req.params;
  const { profissionalId, servicoId, servicoIds, pacoteId, clienteNome, clienteTelefone, data, hora, observacao } = req.body;

  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salão não encontrado' });

  let chosenProfId = profissionalId;

  if (profissionalId === 'any') {
    const profissionaisAtivos = await prisma.profissional.findMany({
      where: { salaoId: salao.id, ativo: true },
      select: { id: true }
    });

    for (const p of profissionaisAtivos) {
      const availSlots = await getHorariosDisponiveis(p.id, null, data, 1, salao.id); // Check at least 1 min to see if they work that day
      if (availSlots.length > 0) {
        // Need to be more precise: check if the SPECIFIC hour is available for the SPECIFIC duration
        // Actually, we can just call getHorariosDisponiveis with full duration
        const fullSlots = await getHorariosDisponiveis(p.id, null, data, 10, salao.id); // Just a quick check
        // Let's just use the logic below to verify the specific chosen slot
        const slotsForProf = await getHorariosDisponiveis(p.id, null, data, 30, salao.id); // Placeholder duration
        if (slotsForProf.includes(hora)) {
           chosenProfId = p.id;
           break;
        }
      }
    }
    
    if (chosenProfId === 'any') {
      return res.status(409).json({ error: 'Nenhum profissional disponível para este horário específico.' });
    }
  }

  const sIds = servicoIds ? (Array.isArray(servicoIds) ? servicoIds : [servicoIds]) : (servicoId ? [servicoId] : []);
  if (!chosenProfId || (sIds.length === 0 && !pacoteId) || !clienteNome || !clienteTelefone || !data || !hora) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  let totalDuracao = 0;
  let totalPreco = 0;
  let itensData = [];
  let nomeItem = '';

  if (pacoteId) {
    const pacote = await prisma.pacote.findFirst({ where: { id: pacoteId, salaoId: salao.id } });
    if (!pacote) return res.status(404).json({ error: 'Pacote não encontrado' });
    const servicoIdsDoPacote = await getServicoIdsDoPacote(pacoteId, salao.id);
    const profissionalCompativelPacote = await profissionalAtendeTodosServicos(chosenProfId, servicoIdsDoPacote, salao.id);
    if (!profissionalCompativelPacote) {
      console.log(`[Agendamento] Profissional ${chosenProfId} não atende oficialmente este pacote.`);
    }
    totalDuracao = pacote.duracaoMin;
    totalPreco = pacote.preco;
    nomeItem = pacote.nome;
  } else {
    const servicos = await prisma.servico.findMany({ where: { id: { in: sIds }, salaoId: salao.id } });
    if (servicos.length === 0) return res.status(404).json({ error: 'Serviços não encontrados' });
    if (servicos.length !== sIds.length) return res.status(404).json({ error: 'Serviços não encontrados' });
    const profissionalCompativelServicos = await profissionalAtendeTodosServicos(chosenProfId, sIds, salao.id);
    if (!profissionalCompativelServicos) {
       console.log(`[Agendamento] Profissional ${chosenProfId} gravando agendamento flexível.`);
    }
    totalDuracao = servicos.reduce((acc, s) => acc + s.duracaoMin, 0);
    totalPreco = servicos.reduce((acc, s) => acc + s.preco, 0);
    itensData = servicos.map(s => ({ servicoId: s.id, nome: s.nome, preco: s.preco, duracaoMin: s.duracaoMin }));
    nomeItem = servicos.map(s => s.nome).join(' + ');
  }

  const [hh, mm] = hora.split(':').map(Number);
  const fimMin = hh * 60 + mm + totalDuracao;
  const fimHora = `${String(Math.floor(fimMin / 60)).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`;

  // Verificação de disponibilidade real (sem rigidez de slots)
  const inicioDia = new Date(data + 'T00:00:00');
  const fimDia = new Date(data + 'T23:59:59');
  
  const colisoes = await prisma.agendamento.findMany({
    where: { 
      profissionalId: chosenProfId, 
      status: { not: 'cancelado' }, 
      data: { gte: inicioDia, lte: fimDia } 
    }
  });

  const temColisao = colisoes.some(a => {
    const aI = a.inicioHora.split(':').map(Number).reduce((h, m) => h * 60 + m);
    const aF = a.fimHora.split(':').map(Number).reduce((h, m) => h * 60 + m);
    const sI = hh * 60 + mm;
    const sF = sI + totalDuracao;
    return sI < aF && sF > aI;
  });

  if (temColisao) return res.status(409).json({ error: 'Este horário acabou de ser ocupado. Por favor, escolha outro.' });

  try {
    const numeroLimpo = clienteTelefone.replace(/\D/g, '');
    
    // Busca robusta: tenta encontrar por número exato ou pelos últimos 9 dígitos
    let cliente = await prisma.cliente.findFirst({ 
      where: { 
        salaoId: salao.id, 
        OR: [
          { telefone: clienteTelefone },
          { telefone: numeroLimpo },
          { telefone: { endsWith: numeroLimpo.slice(-9) } }
        ]
      } 
    });

    if (!cliente) {
      try {
        cliente = await prisma.cliente.create({ 
          data: { 
            salaoId: salao.id, 
            nome: clienteNome, 
            telefone: clienteTelefone 
          } 
        });
      } catch (createErr) {
        // Se falhou na criação por duplicidade (race condition), tenta buscar uma última vez
        cliente = await prisma.cliente.findFirst({ 
          where: { salaoId: salao.id, telefone: { contains: numeroLimpo.slice(-9) } } 
        });
        if (!cliente) throw createErr; // Se mesmo assim não achar, relança o erro
      }
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        salaoId: salao.id,
        profissionalId: chosenProfId,
        servicoId: sIds.length === 1 ? sIds[0] : null,
        pacoteId: pacoteId || null,
        clienteId: cliente.id,
        clienteNome,
        clienteTelefone,
        data: new Date(data + 'T00:00:00'),
        inicioHora: hora,
        fimHora,
        observacao,
        itens: { create: itensData }
      },
      include: { servico: true, pacote: true, profissional: true, itens: true },
    });

    // Notificações (em background)
    notificarClienteAgendamento({
      clienteNome,
      clienteTelefone,
      servico: nomeItem,
      profissional: agendamento.profissional.nome,
      data,
      hora,
      salao,
    }).catch(e => console.error('Erro notif cliente:', e.message));

    notificarSalaoNovoAgendamento({
      salao,
      clienteNome,
      clienteTelefone,
      servico: nomeItem,
      profissional: agendamento.profissional.nome,
      data,
      hora,
    }).catch(e => console.error('Erro notif salão:', e.message));

    return res.status(201).json(agendamento);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(500).json({ error: 'Erro interno ao processar agendamento: ' + error.message });
  }
}

module.exports = {
  getSalao,
  getServicos,
  getPacotesPublicos,
  getProfissionaisPublicos,
  getProfissionaisPorServico,
  getProfissionaisPorPacote,
  getDatasDisponiveisHandler,
  getHorariosDisponiveisHandler: getHorariosDisponiveisHandlerPublic,
  criarAgendamento,
};
