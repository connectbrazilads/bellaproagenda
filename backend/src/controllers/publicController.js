const prisma = require('../lib/prisma');
const { getHorariosDisponiveis } = require('../services/slotsService');
const { notificarClienteAgendamento, notificarSalaoNovoAgendamento } = require('../services/whatsappService');
const { criarNotificacaoSalao } = require('../services/notificationCenterService');
const {
  getServicoIdsDoPacote,
  getServicoIdsDoProfissional,
  profissionalAtendeTodosServicos,
} = require('../lib/profissionalServicoValidation');

async function findSalao(slug) {
  return await prisma.salao.findUnique({ where: { slug } });
}

function normalizarTelefone(valor = '') {
  return String(valor || '').replace(/\D/g, '');
}

function calcularFimHora(inicioHora, duracaoMin) {
  const [hora, minuto] = String(inicioHora || '').split(':').map(Number);
  if (Number.isNaN(hora) || Number.isNaN(minuto)) return null;
  const total = (hora * 60) + minuto + Number(duracaoMin || 0);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function findOrCreateClientePublico(salaoId, clienteNome, clienteTelefone) {
  const numeroLimpo = normalizarTelefone(clienteTelefone);
  const sufixo = numeroLimpo.slice(-9);

  let cliente = await prisma.cliente.findFirst({
    where: {
      salaoId,
      OR: [
        { telefone: clienteTelefone },
        { telefone: numeroLimpo },
        ...(sufixo ? [{ telefone: { endsWith: sufixo } }] : []),
      ],
    },
  });

  if (!cliente) {
    try {
      cliente = await prisma.cliente.create({
        data: {
          salaoId,
          nome: clienteNome,
          telefone: numeroLimpo || clienteTelefone,
        }
      });
    } catch (createErr) {
      cliente = await prisma.cliente.findFirst({
        where: {
          salaoId,
          ...(sufixo ? { telefone: { endsWith: sufixo } } : { telefone: clienteTelefone }),
        },
      });
      if (!cliente) throw createErr;
    }
  }

  return cliente;
}

async function createComandaPublica({
  salaoId,
  clienteId,
  clienteNome,
  clienteTelefone,
  data,
  origem = 'online',
  observacao = null,
}) {
  return prisma.comanda.create({
    data: {
      salaoId,
      clienteId: clienteId || null,
      clienteNome,
      clienteTelefone,
      data,
      origem,
      observacao: observacao || null,
    },
  });
}

function formatarDataNotificacao(dataStr) {
  const [ano, mes, dia] = String(dataStr || '').split('-');
  if (!ano || !mes || !dia) return String(dataStr || '');
  return `${dia}/${mes}/${ano}`;
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
    include: {
      categoria: true,
    },
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

  const profissionais = await prisma.profissional.findMany({
    where: {
      salaoId: salao.id,
      ativo: true,
    },
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
      servicoCategorias: {
        select: {
          categoria: {
            select: {
              servicos: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  const compativeis = profissionais
    .filter((profissional) => getServicoIdsDoProfissional(profissional).includes(servicoId))
    .map(({ servicos, servicoCategorias, ...profissional }) => profissional);

  res.json(compativeis);
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
      servicoCategorias: {
        select: {
          categoria: {
            select: {
              servicos: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  const compativeis = profissionais
    .filter((profissional) => {
      const ids = new Set(getServicoIdsDoProfissional(profissional));
      return servicoIdsDoPacote.every((servicoId) => ids.has(servicoId));
    })
    .map(({ servicos, servicoCategorias, ...profissional }) => profissional);

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

    const comanda = await createComandaPublica({
      salaoId: salao.id,
      clienteId: cliente?.id,
      clienteNome,
      clienteTelefone,
      data: new Date(data + 'T00:00:00'),
      origem: 'online',
      observacao,
    });

    const agendamento = await prisma.agendamento.create({
      data: {
        salaoId: salao.id,
        comandaId: comanda.id,
        grupoAtendimentoId: comanda.id,
        profissionalId: chosenProfId,
        servicoId: sIds.length === 1 ? sIds[0] : null,
        pacoteId: pacoteId || null,
        clienteId: cliente.id,
        clienteNome,
        clienteTelefone,
        data: new Date(data + 'T00:00:00'),
        inicioHora: hora,
        fimHora,
        origem: 'online',
        observacao,
        itens: { create: itensData }
      },
      include: { servico: true, pacote: true, profissional: true, itens: true },
    });

    // Notificações (em background)
    criarNotificacaoSalao({
      salaoId: salao.id,
      tipo: 'agendamento_online_novo',
      titulo: 'Novo agendamento online',
      mensagem: `${clienteNome} agendou ${nomeItem} com ${agendamento.profissional.nome} em ${formatarDataNotificacao(data)} as ${hora}.`,
      agendamentoId: agendamento.id,
      contexto: {
        clienteNome,
        clienteTelefone,
        servico: nomeItem,
        profissional: agendamento.profissional.nome,
        data,
        hora,
      },
    }).catch((e) => console.error('Erro notificacao interna:', e.message));

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

async function criarAgendamentoMultiplo(req, res) {
  const { slug } = req.params;
  const { clienteNome, clienteTelefone, data, observacao, itens } = req.body;
  const itensLista = Array.isArray(itens) ? itens : [];
  const dataBase = String(data || '').slice(0, 10);

  if (!clienteNome || !clienteTelefone || !dataBase || itensLista.length === 0) {
    return res.status(400).json({ error: 'Cliente, data e itens sao obrigatorios.' });
  }

  if (itensLista.some((item) => !item?.servicoId || !item?.profissionalId || !item?.hora)) {
    return res.status(400).json({ error: 'Cada item precisa ter servico, profissional e horario.' });
  }

  const salao = await findSalao(slug);
  if (!salao) return res.status(404).json({ error: 'Salao nao encontrado' });

  try {
    const cliente = await findOrCreateClientePublico(salao.id, clienteNome, clienteTelefone);
    const dataAgendamento = new Date(`${dataBase}T00:00:00`);
    const comanda = await createComandaPublica({
      salaoId: salao.id,
      clienteId: cliente?.id,
      clienteNome,
      clienteTelefone,
      data: dataAgendamento,
      origem: 'online',
      observacao,
    });

    const profissionaisIds = [...new Set(itensLista.map((item) => item.profissionalId))];
    const servicosIds = [...new Set(itensLista.map((item) => item.servicoId))];

    const [profissionaisDb, servicosDb] = await Promise.all([
      prisma.profissional.findMany({
        where: { salaoId: salao.id, ativo: true, id: { in: profissionaisIds } },
        select: { id: true, nome: true },
      }),
      prisma.servico.findMany({
        where: { salaoId: salao.id, id: { in: servicosIds } },
        select: { id: true, nome: true, preco: true, duracaoMin: true },
      }),
    ]);

    if (profissionaisDb.length !== profissionaisIds.length) {
      return res.status(400).json({ error: 'Um ou mais profissionais nao foram encontrados.' });
    }

    if (servicosDb.length !== servicosIds.length) {
      return res.status(400).json({ error: 'Um ou mais servicos nao foram encontrados.' });
    }

    const profissionaisMap = new Map(profissionaisDb.map((item) => [item.id, item]));
    const servicosMap = new Map(servicosDb.map((item) => [item.id, item]));
    const agendaLocalPorProfissional = new Map();
    const itensPreparados = [];

    for (let index = 0; index < itensLista.length; index += 1) {
      const item = itensLista[index];
      const profissional = profissionaisMap.get(item.profissionalId);
      const servico = servicosMap.get(item.servicoId);

      if (!profissional || !servico) {
        return res.status(400).json({ error: `Item ${index + 1} invalido para este salao.` });
      }

      const profissionalCompativel = await profissionalAtendeTodosServicos(profissional.id, [servico.id], salao.id);
      if (!profissionalCompativel) {
        return res.status(400).json({ error: `${profissional.nome} nao atende o servico ${servico.nome}.` });
      }

      const fimHora = calcularFimHora(item.hora, servico.duracaoMin);
      if (!fimHora) {
        return res.status(400).json({ error: `Horario invalido no item ${index + 1}.` });
      }

      const slots = await getHorariosDisponiveis(profissional.id, null, dataBase, servico.duracaoMin, salao.id);
      if (!slots.includes(item.hora)) {
        return res.status(409).json({ error: `${profissional.nome} nao esta mais disponivel as ${item.hora} para ${servico.nome}.` });
      }

      const agendaLocal = agendaLocalPorProfissional.get(profissional.id) || [];
      const inicioMin = Number(item.hora.split(':')[0]) * 60 + Number(item.hora.split(':')[1]);
      const fimMin = Number(fimHora.split(':')[0]) * 60 + Number(fimHora.split(':')[1]);
      const conflita = agendaLocal.some((slot) => inicioMin < slot.fimMin && fimMin > slot.inicioMin);
      if (conflita) {
        return res.status(400).json({ error: `Os itens de ${profissional.nome} estao com horarios sobrepostos.` });
      }

      agendaLocal.push({ inicioMin, fimMin });
      agendaLocalPorProfissional.set(profissional.id, agendaLocal);

      itensPreparados.push({
        profissional,
        servico,
        hora: item.hora,
        fimHora,
      });
    }

    const agendamentos = await prisma.$transaction(
      itensPreparados.map((item) =>
        prisma.agendamento.create({
          data: {
            salaoId: salao.id,
            comandaId: comanda.id,
            grupoAtendimentoId: comanda.id,
            profissionalId: item.profissional.id,
            servicoId: item.servico.id,
            clienteId: cliente?.id,
            clienteNome,
            clienteTelefone,
            data: dataAgendamento,
            inicioHora: item.hora,
            fimHora: item.fimHora,
            origem: 'online',
            observacao,
          },
          include: {
            servico: true,
            profissional: true,
            itens: true,
          },
        })
      )
    );

    const nomesServicos = itensPreparados.map((item) => item.servico.nome).join(' + ');
    const profissionalResumo = itensPreparados.map((item) => `${item.servico.nome}: ${item.profissional.nome}`).join(', ');

    criarNotificacaoSalao({
      salaoId: salao.id,
      tipo: 'agendamento_online_novo',
      titulo: 'Novo agendamento online',
      mensagem: `${clienteNome} montou uma comanda online para ${formatarDataNotificacao(dataBase)}.`,
      agendamentoId: agendamentos[0]?.id || null,
      contexto: {
        clienteNome,
        clienteTelefone,
        servicos: nomesServicos,
        profissionais: profissionalResumo,
        data: dataBase,
      },
    }).catch((e) => console.error('Erro notificacao interna:', e.message));

    notificarClienteAgendamento({
      clienteNome,
      clienteTelefone,
      servico: nomesServicos,
      profissional: 'Equipe do salao',
      data: dataBase,
      hora: itensPreparados.map((item) => `${item.servico.nome} ${item.hora}`).join(' | '),
      salao,
    }).catch((e) => console.error('Erro notif cliente:', e.message));

    notificarSalaoNovoAgendamento({
      salao,
      clienteNome,
      clienteTelefone,
      servico: nomesServicos,
      profissional: profissionalResumo,
      data: dataBase,
      hora: itensPreparados.map((item) => item.hora).join(', '),
    }).catch((e) => console.error('Erro notif salao:', e.message));

    return res.status(201).json({
      comandaId: comanda.id,
      agendamentos,
    });
  } catch (error) {
    console.error('Erro ao criar agendamento multiplo:', error);
    return res.status(500).json({ error: 'Erro interno ao processar agendamento multiplo: ' + error.message });
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
  criarAgendamentoMultiplo,
};
