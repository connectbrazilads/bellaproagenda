const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const {
  getServicoIdsDoPacote,
  profissionalAtendeTodosServicos,
} = require('../lib/profissionalServicoValidation');
const {
  sanitizePermissions,
  sanitizeActionPermissions,
  getEffectivePermissions,
  getEffectiveActionPermissions,
} = require('../lib/permissions');
const { createAuditLog } = require('../lib/audit');
const { validateStrongPassword } = require('../lib/security');
const {
  buildWebhookUrl,
  connectEvolutionInstance,
  disconnectEvolutionInstance,
  getEvolutionStatus,
  getGlobalEvolutionApiKey,
  resolveEvolutionConfig,
  sendEvolutionText,
} = require('../services/evolutionService');
const {
  listarNotificacoesSalao,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} = require('../services/notificationCenterService');

function isScopedProfessional(req) {
  return req.user?.role === 'profissional' && !!req.user?.profissionalId;
}

function getScopedProfessionalId(req, requestedProfessionalId) {
  return isScopedProfessional(req) ? req.user.profissionalId : requestedProfessionalId;
}

function professionalScopeFilter(req) {
  return isScopedProfessional(req) ? { profissionalId: req.user.profissionalId } : {};
}

async function getCaixaAberto(salaoId) {
  return prisma.caixaSessao.findFirst({
    where: {
      salaoId,
      status: 'aberto',
    },
    orderBy: { abertoEm: 'desc' },
    select: {
      id: true,
      turnoNome: true,
      abertoEm: true,
    },
  });
}

async function getCaixaAbertoComResumo(salaoId) {
  const sessao = await prisma.caixaSessao.findFirst({
    where: {
      salaoId,
      status: 'aberto',
    },
    orderBy: { abertoEm: 'desc' },
    include: {
      movimentos: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!sessao) return null;

  const resumo = await buildCaixaResumo({
    salaoId,
    inicio: sessao.abertoEm,
    fim: new Date(),
    profissionalId: null,
  });

  return {
    ...sessao,
    resumo,
  };
}

function calcularDinheiroDisponivelCaixa(caixa) {
  const resumo = caixa?.resumo || {};
  return Number(caixa?.fundoInicial || 0)
    + Number(resumo.totalDinheiro || 0)
    + Number(resumo.totalSuprimentos || 0)
    - Number(resumo.totalSangrias || 0);
}

function formatCurrencyBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function buildPublicBookingUrl(salao, req) {
  const baseUrl = String(process.env.APP_URL || req.headers.origin || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/${salao.slug}`;
}

function horaParaMinutos(hora) {
  const [h, m] = String(hora || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

async function getAllowedServicoIds(req) {
  if (!isScopedProfessional(req)) return null;

  const rows = await prisma.profissionalServico.findMany({
    where: { profissionalId: req.user.profissionalId },
    select: { servicoId: true },
  });

  return rows.map((row) => row.servicoId);
}

async function getScopedAgendamento(req, id, include) {
  return prisma.agendamento.findFirst({
    where: {
      id,
      salaoId: req.user.salaoId,
      ...professionalScopeFilter(req),
    },
    include,
  });
}

async function buildCaixaResumo({ salaoId, inicio, fim, profissionalId }) {
  const where = {
    salaoId,
    data: {
      gte: inicio,
      lte: fim,
    },
    ...(profissionalId ? { profissionalId } : {}),
  };

  const [agendamentosRaw, despesas, sessoesNoPeriodo] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: {
        pagamentos: true,
        servico: true,
        pacote: true,
        itens: true,
        produtos: true,
      },
    }),
    prisma.despesa.findMany({
      where: profissionalId
        ? { id: '__no_expenses_for_professional__' }
        : {
            salaoId,
            data: {
              gte: inicio,
              lte: fim,
            },
          },
    }),
    prisma.caixaSessao.findMany({
      where: {
        salaoId,
        abertoEm: { lte: fim },
        OR: [
          { fechadoEm: null },
          { fechadoEm: { gte: inicio } },
        ],
      },
      include: {
        movimentos: true,
      },
    }),
  ]);

  const agendamentos = agendamentosRaw.filter((ag) => ag.status === 'concluido' || ag.pagamentos.length > 0);
  const porForma = {};
  let totalRecebido = 0;
  let totalDinheiro = 0;
  let totalSangrias = 0;
  let totalSuprimentos = 0;
  let totalAdiantamentosProfissionais = 0;

  agendamentos.forEach((ag) => {
    ag.pagamentos.forEach((pagamento) => {
      const forma = pagamento.forma || 'Nao informado';
      const valor = Number(pagamento.valor || 0);
      porForma[forma] = (porForma[forma] || 0) + valor;
      totalRecebido += valor;
      if (forma.toLowerCase().includes('dinheiro')) {
        totalDinheiro += valor;
      }
    });
  });

  sessoesNoPeriodo.forEach((sessao) => {
    sessao.movimentos.forEach((movimento) => {
      if (movimento.createdAt < inicio || movimento.createdAt > fim) return;
      if (movimento.tipo === 'sangria') totalSangrias += Number(movimento.valor || 0);
      if (movimento.tipo === 'adiantamento_profissional') {
        totalSangrias += Number(movimento.valor || 0);
        totalAdiantamentosProfissionais += Number(movimento.valor || 0);
      }
      if (movimento.tipo === 'suprimento') totalSuprimentos += Number(movimento.valor || 0);
    });
  });

  return {
    totalRecebido,
    totalDinheiro,
    totalDespesas: despesas.reduce((sum, despesa) => sum + Number(despesa.valor || 0), 0),
    totalSangrias,
    totalSuprimentos,
    totalAdiantamentosProfissionais,
    qtdLancamentos: agendamentos.length,
    porForma,
  };
}

function calcularTotalAgendamento(agendamento) {
  const precoBase = Number(agendamento?.servico?.preco ?? agendamento?.pacote?.preco ?? 0);
  const precoItens = agendamento?.itens?.reduce((sum, item) => sum + Number(item.preco || 0), 0) || 0;
  const precoProdutos = agendamento?.produtos?.reduce((sum, item) => sum + (Number(item.preco || 0) * Number(item.quantidade || 0)), 0) || 0;
  return precoBase + precoItens + precoProdutos;
}

function calcularSaldoLancamento(lancamento) {
  return Math.max(0, Number(lancamento?.valor || 0) - Number(lancamento?.valorCompensado || 0));
}

async function aplicarConsumoEstoqueDoServico(agendamento) {
  if (!agendamento || agendamento.estoqueConsumido) return;

  const ocorrenciasServico = {};
  if (agendamento.servicoId) {
    ocorrenciasServico[agendamento.servicoId] = (ocorrenciasServico[agendamento.servicoId] || 0) + 1;
  }
  for (const item of agendamento.itens || []) {
    if (!item.servicoId) continue;
    ocorrenciasServico[item.servicoId] = (ocorrenciasServico[item.servicoId] || 0) + 1;
  }

  const servicoIds = Object.keys(ocorrenciasServico);
  if (servicoIds.length === 0) {
    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: { estoqueConsumido: true },
    });
    return;
  }

  const consumos = await prisma.servicoProdutoConsumo.findMany({
    where: { servicoId: { in: servicoIds } },
  });

  const totaisPorProduto = {};
  for (const consumo of consumos) {
    const multiplicador = ocorrenciasServico[consumo.servicoId] || 0;
    if (!multiplicador) continue;
    totaisPorProduto[consumo.produtoId] = (totaisPorProduto[consumo.produtoId] || 0) + (Number(consumo.quantidade || 0) * multiplicador);
  }

  const produtosIds = Object.keys(totaisPorProduto);
  for (const produtoId of produtosIds) {
    const quantidade = Math.max(0, Math.round(totaisPorProduto[produtoId] || 0));
    if (!quantidade) continue;
    await prisma.produto.updateMany({
      where: {
        id: produtoId,
        estoque: { gt: 0 },
      },
      data: {
        estoque: { decrement: quantidade },
      },
    });
  }

  await prisma.agendamento.update({
    where: { id: agendamento.id },
    data: { estoqueConsumido: true },
  });
}

function getDateRange(query, defaultDays = 30) {
  const now = new Date();
  const inicio = query.inicio ? new Date(`${query.inicio}T00:00:00`) : new Date(now.getTime() - (defaultDays * 24 * 60 * 60 * 1000));
  const fim = query.fim ? new Date(`${query.fim}T23:59:59`) : now;
  return { inicio, fim };
}

function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '');
}

// ─── SALÃO ───────────────────────────────────────────────────────────────────

async function getSalao(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  res.json(salao);
}

async function updateSalao(req, res) {
  const {
    nome, telefone, endereco, corPrimaria, corSecundaria,
    bannerUrl, bannerTexto, tema, whatsapp, whatsappAgendamentos, logoUrl,
    infoFaq, infoPoliticas, infoPromocoes, infoRegras
  } = req.body;
  const salao = await prisma.salao.update({
    where: { id: req.user.salaoId },
    data: {
      nome, telefone, endereco, corPrimaria, corSecundaria,
      bannerUrl, bannerTexto, tema, whatsapp, whatsappAgendamentos, logoUrl,
      infoFaq, infoPoliticas, infoPromocoes, infoRegras
    }
  });
  res.json(salao);
}

// ─── PROFISSIONAIS ───────────────────────────────────────────────────────────

async function getProfissionais(req, res) {
  const profissionais = await prisma.profissional.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...(isScopedProfessional(req) ? { id: req.user.profissionalId } : {}),
    },
    orderBy: { nome: 'asc' },
    include: {
      servicos: { include: { servico: true } },
      categorias: { include: { categoria: true } },
      horarios: { orderBy: { diaSemana: 'asc' } },
    },
  });
  res.json(profissionais);
}

async function createProfissional(req, res) {
  if (isScopedProfessional(req)) {
    return res.status(403).json({ error: 'Você só pode acessar o seu próprio cadastro profissional' });
  }

  const salao = await prisma.salao.findUnique({
    where: { id: req.user.salaoId },
    include: { _count: { select: { profissionais: true } } }
  });

  if (salao._count.profissionais >= salao.maxProfissionais) {
    return res.status(403).json({ error: `Limite atingido: O seu plano permite até ${salao.maxProfissionais} profissionais.` });
  }

  const { 
    nome, bio, fotoUrl, servicos, categoriasIds, comissaoPercent,
    email, telefone, cpf, rg, dataNascimento, endereco,
    numero, complemento, bairro, cep, cidade, estado,
    banco, agencia, conta, pix,
    metaMensal, bonusMetaValor, bonusMetaPercent
  } = req.body;

  const profissional = await prisma.profissional.create({
    data: {
      salaoId: req.user.salaoId,
      nome, bio, fotoUrl,
      email, telefone, cpf, rg,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      endereco, numero, complemento, bairro, cep, cidade, estado,
      banco, agencia, conta, pix,
      comissaoPercent: comissaoPercent ?? 50,
      metaMensal: metaMensal ?? 0,
      bonusMetaValor: bonusMetaValor ?? 0,
      bonusMetaPercent: bonusMetaPercent ?? 0,
      categorias: categoriasIds?.length
        ? {
            create: categoriasIds.map((categoriaId) => ({ categoriaId })),
          }
        : undefined,
      servicos: servicos?.length ? { 
        create: servicos.map((s) => ({ 
          servicoId: s.id, 
          comissaoPercent: s.comissaoPercent, 
          comissaoValor: s.comissaoValor 
        })) 
      } : undefined,
    },
    include: {
      servicos: { include: { servico: true } },
      categorias: { include: { categoria: true } },
    },
  });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'profissionais.criar',
    entidade: 'profissional',
    entidadeId: profissional.id,
    mensagem: 'Profissional criado',
    contexto: { nome: profissional.nome },
    req,
  });
  res.status(201).json(profissional);
}

async function updateProfissional(req, res) {
  const id = getScopedProfessionalId(req, req.params.id);
  const { 
    nome, bio, fotoUrl, ativo, servicos, categoriasIds, comissaoPercent,
    email, telefone, cpf, rg, dataNascimento, endereco,
    numero, complemento, bairro, cep, cidade, estado,
    banco, agencia, conta, pix,
    metaMensal, bonusMetaValor, bonusMetaPercent
  } = req.body;

  const exist = await prisma.profissional.findFirst({ where: { id, salaoId: req.user.salaoId } });
  if (!exist) return res.status(403).json({ error: 'Proibido' });

  if (servicos !== undefined) {
    await prisma.profissionalServico.deleteMany({ where: { profissionalId: id } });
    if (servicos.length > 0) {
      await prisma.profissionalServico.createMany({
        data: servicos.map((s) => ({ 
          profissionalId: id, 
          servicoId: s.id,
          comissaoPercent: s.comissaoPercent,
          comissaoValor: s.comissaoValor
        })),
      });
    }
  }

  if (categoriasIds !== undefined) {
    await prisma.profissionalCategoria.deleteMany({ where: { profissionalId: id } });
    if (categoriasIds.length > 0) {
      await prisma.profissionalCategoria.createMany({
        data: categoriasIds.map((categoriaId) => ({
          profissionalId: id,
          categoriaId,
        })),
      });
    }
  }

  const profissional = await prisma.profissional.update({
    where: { id },
    data: { 
      nome, bio, fotoUrl, ativo, 
      email, telefone, cpf, rg,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      endereco, numero, complemento, bairro, cep, cidade, estado,
      banco, agencia, conta, pix,
      ...(comissaoPercent !== undefined && { comissaoPercent }),
      ...(metaMensal !== undefined && { metaMensal }),
      ...(bonusMetaValor !== undefined && { bonusMetaValor }),
      ...(bonusMetaPercent !== undefined && { bonusMetaPercent }),
    },
    include: {
      servicos: { include: { servico: true } },
      categorias: { include: { categoria: true } },
      horarios: true,
    },
  });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'profissionais.editar',
    entidade: 'profissional',
    entidadeId: profissional.id,
    mensagem: 'Profissional atualizado',
    contexto: { nome: profissional.nome },
    req,
  });
  res.json(profissional);
}

async function deleteProfissional(req, res) {
  if (isScopedProfessional(req)) {
    return res.status(403).json({ error: 'VocÃª nÃ£o pode excluir o seu prÃ³prio cadastro profissional' });
  }

  const { id } = req.params;
  await prisma.profissional.deleteMany({ where: { id, salaoId: req.user.salaoId } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'profissionais.excluir',
    entidade: 'profissional',
    entidadeId: id,
    mensagem: 'Profissional removido',
    req,
  });
  res.json({ ok: true });
}

// ─── HORÁRIOS ────────────────────────────────────────────────────────────────

async function getCategoriasProfissionais(req, res) {
  const categorias = await prisma.categoriaProfissional.findMany({
    where: { salaoId: req.user.salaoId, ativo: true },
    orderBy: { nome: 'asc' },
  });
  res.json(categorias);
}

async function createCategoriaProfissional(req, res) {
  const nome = String(req.body?.nome || '').trim();
  if (!nome) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });

  const categoria = await prisma.categoriaProfissional.create({
    data: {
      salaoId: req.user.salaoId,
      nome,
    },
  });
  res.status(201).json(categoria);
}

async function deleteCategoriaProfissional(req, res) {
  const { id } = req.params;
  await prisma.profissionalCategoria.deleteMany({ where: { categoriaId: id } });
  await prisma.categoriaProfissional.deleteMany({ where: { id, salaoId: req.user.salaoId } });
  res.json({ ok: true });
}

async function setHorarios(req, res) {
  const id = getScopedProfessionalId(req, req.params.id);
  const { horarios } = req.body;

  const profissional = await prisma.profissional.findFirst({
    where: { id, salaoId: req.user.salaoId },
    select: { id: true },
  });
  if (!profissional) return res.status(403).json({ error: 'Proibido' });

  await prisma.horario.deleteMany({ where: { profissionalId: id } });
  if (horarios?.length > 0) {
    await prisma.horario.createMany({ data: horarios.map((h) => ({ ...h, profissionalId: id })) });
  }
  res.json({ ok: true });
}

// ─── SERVIÇOS ────────────────────────────────────────────────────────────────

async function getServicos(req, res) {
  const allowedServicoIds = await getAllowedServicoIds(req);
  const servicos = await prisma.servico.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...(allowedServicoIds ? { id: { in: allowedServicoIds } } : {}),
    },
    orderBy: { nome: 'asc' },
    include: {
      consumos: {
        include: {
          produto: {
            select: { id: true, nome: true, estoque: true },
          },
        },
      },
    },
  });
  res.json(servicos);
}

async function createServico(req, res) {
  const { nome, descricao, duracaoMin, preco, custoProduto, consumosProdutos } = req.body;
  const servico = await prisma.servico.create({
    data: {
      salaoId: req.user.salaoId,
      nome,
      descricao,
      duracaoMin,
      preco,
      custoProduto: custoProduto ?? 0,
      consumos: consumosProdutos?.length
        ? {
            create: consumosProdutos.map((item) => ({
              produtoId: item.produtoId,
              quantidade: Number(item.quantidade || 1),
            })),
          }
        : undefined,
    },
    include: {
      consumos: {
        include: {
          produto: {
            select: { id: true, nome: true, estoque: true },
          },
        },
      },
    },
  });
  res.status(201).json(servico);
}

async function updateServico(req, res) {
  const { id } = req.params;
  const { nome, descricao, duracaoMin, preco, custoProduto, ativo, consumosProdutos } = req.body;
  const existe = await prisma.servico.findFirst({ where: { id, salaoId: req.user.salaoId } });
  if (!existe) return res.status(404).json({ error: 'Serviço não encontrado' });

  if (consumosProdutos !== undefined) {
    await prisma.servicoProdutoConsumo.deleteMany({ where: { servicoId: id } });
  }

  const servico = await prisma.servico.update({
    where: { id },
    data: {
      nome,
      descricao,
      duracaoMin,
      preco,
      custoProduto,
      ativo,
      consumos: consumosProdutos?.length
        ? {
            create: consumosProdutos.map((item) => ({
              produtoId: item.produtoId,
              quantidade: Number(item.quantidade || 1),
            })),
          }
        : undefined,
    },
    include: {
      consumos: {
        include: {
          produto: {
            select: { id: true, nome: true, estoque: true },
          },
        },
      },
    },
  });
  res.json(servico);
}

async function deleteServico(req, res) {
  await prisma.servico.deleteMany({ where: { id: req.params.id, salaoId: req.user.salaoId } });
  res.json({ ok: true });
}

// ─── PRODUTOS ────────────────────────────────────────────────────────────────

async function getProdutos(req, res) {
  const produtos = await prisma.produto.findMany({
    where: { salaoId: req.user.salaoId },
    orderBy: { nome: 'asc' },
    include: {
      consumosServico: {
        include: {
          servico: {
            select: { id: true, nome: true },
          },
        },
      },
    },
  });
  res.json(produtos);
}

async function createProduto(req, res) {
  const { nome, descricao, preco, estoque } = req.body;
  const produto = await prisma.produto.create({ data: { salaoId: req.user.salaoId, nome, descricao, preco, estoque: estoque ?? 0 } });
  res.status(201).json(produto);
}

async function updateProduto(req, res) {
  const { id } = req.params;
  const { nome, descricao, preco, estoque, ativo } = req.body;
  const produto = await prisma.produto.updateMany({
    where: { id, salaoId: req.user.salaoId },
    data: { nome, descricao, preco, estoque, ativo }
  });
  res.json(produto);
}

async function deleteProduto(req, res) {
  await prisma.produto.deleteMany({ where: { id: req.params.id, salaoId: req.user.salaoId } });
  res.json({ ok: true });
}

// ─── DESPESAS ────────────────────────────────────────────────────────────────

async function getDespesas(req, res) {
  const { inicio, fim } = req.query;
  const despesas = await prisma.despesa.findMany({
    where: {
      salaoId: req.user.salaoId,
      data: { gte: new Date(inicio + 'T00:00:00'), lte: new Date(fim + 'T23:59:59') },
    },
    orderBy: { data: 'desc' },
  });
  res.json(despesas);
}

async function createDespesa(req, res) {
  const { descricao, valor, categoria, data } = req.body;
  const despesa = await prisma.despesa.create({
    data: { salaoId: req.user.salaoId, descricao, valor, categoria, data: new Date(data + 'T12:00:00') }
  });
  res.status(201).json(despesa);
}

async function deleteDespesa(req, res) {
  await prisma.despesa.deleteMany({ where: { id: req.params.id, salaoId: req.user.salaoId } });
  res.json({ ok: true });
}

// ─── PACOTES ─────────────────────────────────────────────────────────────────

async function getPacotes(req, res) {
  const pacotes = await prisma.pacote.findMany({
    where: { salaoId: req.user.salaoId },
    orderBy: { nome: 'asc' },
    include: { servicos: { include: { servico: { select: { id: true, nome: true } } } } },
  });

  if (!isScopedProfessional(req)) {
    return res.json(pacotes);
  }

  const allowedServicoIds = new Set(await getAllowedServicoIds(req));
  const pacotesPermitidos = pacotes.filter((pacote) =>
    (pacote.servicos || []).length > 0 &&
    pacote.servicos.every((item) => allowedServicoIds.has(item.servicoId))
  );

  res.json(pacotesPermitidos);
}

async function createPacote(req, res) {
  const { nome, descricao, preco, duracaoMin, servicoIds } = req.body;
  const pacote = await prisma.pacote.create({
    data: {
      salaoId: req.user.salaoId,
      nome, descricao, preco, duracaoMin,
      servicos: servicoIds?.length ? { create: servicoIds.map((id) => ({ servicoId: id })) } : undefined,
    },
    include: { servicos: { include: { servico: true } } },
  });
  res.status(201).json(pacote);
}

async function updatePacote(req, res) {
  const { id } = req.params;
  const { nome, descricao, preco, duracaoMin, ativo, servicoIds } = req.body;

  const exist = await prisma.pacote.findFirst({ where: { id, salaoId: req.user.salaoId } });
  if (!exist) return res.status(403).json({ error: 'Proibido' });

  if (servicoIds !== undefined) {
    await prisma.pacoteServico.deleteMany({ where: { pacoteId: id } });
    if (servicoIds.length > 0) {
      await prisma.pacoteServico.createMany({
        data: servicoIds.map((sid) => ({ pacoteId: id, servicoId: sid })),
      });
    }
  }

  const pacote = await prisma.pacote.update({
    where: { id },
    data: { nome, descricao, preco, duracaoMin, ativo },
    include: { servicos: { include: { servico: true } } },
  });
  res.json(pacote);
}

async function deletePacote(req, res) {
  await prisma.pacote.deleteMany({ where: { id: req.params.id, salaoId: req.user.salaoId } });
  res.json({ ok: true });
}

// ─── BLOQUEIOS ───────────────────────────────────────────────────────────────

async function getBloqueios(req, res) {
  const profissionalId = getScopedProfessionalId(req, req.query.profissionalId);
  const bloqueios = await prisma.bloqueio.findMany({
    where: {
      profissional: { salaoId: req.user.salaoId },
      ...(profissionalId && { profissionalId })
    },
    orderBy: { data: 'asc' },
    include: { profissional: { select: { nome: true } } },
  });
  res.json(bloqueios);
}

async function createBloqueio(req, res) {
  const { data, inicioHora, fimHora, motivo } = req.body;
  const profissionalId = getScopedProfessionalId(req, req.body.profissionalId);
  let inicioHoraNormalizado = typeof inicioHora === 'string' && inicioHora.trim() ? inicioHora.trim() : null;
  let fimHoraNormalizado = typeof fimHora === 'string' && fimHora.trim() ? fimHora.trim() : null;
  
  const prof = await prisma.profissional.findFirst({ where: { id: profissionalId, salaoId: req.user.salaoId } });
  if (!prof) return res.status(403).json({ error: 'Proibido' });

  if (!inicioHoraNormalizado && !fimHoraNormalizado) {
    inicioHoraNormalizado = null;
    fimHoraNormalizado = null;
  } else if (!inicioHoraNormalizado || !fimHoraNormalizado) {
    return res.status(400).json({ error: 'Informe inicio e fim ou deixe ambos vazios para bloquear o dia inteiro.' });
  } else if (horaParaMinutos(fimHoraNormalizado) <= horaParaMinutos(inicioHoraNormalizado)) {
    return res.status(400).json({ error: 'O horario final precisa ser maior que o horario inicial.' });
  }

  const bloqueio = await prisma.bloqueio.create({
    data: {
      profissionalId,
      data: new Date(data + 'T00:00:00'),
      inicioHora: inicioHoraNormalizado,
      fimHora: fimHoraNormalizado,
      motivo,
    },
    include: { profissional: { select: { nome: true } } },
  });
  res.status(201).json(bloqueio);
}

async function deleteBloqueio(req, res) {
  await prisma.bloqueio.deleteMany({
    where: { 
      id: req.params.id, 
      profissional: {
        salaoId: req.user.salaoId,
        ...(isScopedProfessional(req) ? { id: req.user.profissionalId } : {}),
      } 
    }
  });
  res.json({ ok: true });
}

// ─── CLIENTES ─────────────────────────────────────────────────────────

async function getClientes(req, res) {
  const clientes = await prisma.cliente.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...(isScopedProfessional(req)
        ? { agendamentos: { some: { profissionalId: req.user.profissionalId } } }
        : {}),
    },
    orderBy: { nome: 'asc' },
    include: {
      agendamentos: {
        where: isScopedProfessional(req) ? { profissionalId: req.user.profissionalId } : undefined,
        include: {
          servico: { select: { preco: true } },
          pacote: { select: { preco: true } },
          itens: true,
        },
      },
    },
  });

  const agora = Date.now();
  const resultado = clientes.map((c) => {
    const concluidos = c.agendamentos.filter((a) => a.status === 'concluido');
    const totalGasto = concluidos.reduce((sum, a) => {
      const base = a.servico?.preco ?? a.pacote?.preco ?? 0;
      const extras = a.itens.reduce((s, i) => s + i.preco, 0);
      return sum + base + extras;
    }, 0);
    const ultimaVisitaAg = [...concluidos].sort((a, b) => new Date(b.data) - new Date(a.data))[0];
    const ultimaVisita = ultimaVisitaAg?.data || null;
    const diasSemVir = ultimaVisita ? Math.floor((agora - new Date(ultimaVisita)) / 86400000) : null;
    const statusCliente =
      diasSemVir === null ? 'sem_visita'
      : diasSemVir <= 60 ? 'ativo'
      : diasSemVir <= 180 ? 'inativo'
      : 'perdido';

    return {
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      createdAt: c.createdAt,
      visitas: concluidos.length,
      totalAgendamentos: c.agendamentos.length,
      totalGasto,
      ultimaVisita,
      diasSemVir,
      status: statusCliente,
    };
  });

  res.json(resultado);
}

async function buscarClientes(req, res) {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const cleanQ = q.replace(/\D/g, '');

  const clientes = await prisma.cliente.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...(isScopedProfessional(req)
        ? { agendamentos: { some: { profissionalId: req.user.profissionalId } } }
        : {}),
      OR: [
        { nome: { contains: q, mode: 'insensitive' } },
        { apelido: { contains: q, mode: 'insensitive' } },
        { telefone: { contains: cleanQ || q } }
      ]
    },
    take: 10
  });

  res.json(clientes);
}

async function createCliente(req, res) {
  const { nome, telefone, email, instagram, cpf, rg, dataNascimento, endereco } = req.body;
  const salaoId = req.user.salaoId;
  const cleanTel = (telefone || '').replace(/\D/g, '');

  if (!nome || !cleanTel) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });

  const existe = await prisma.cliente.findFirst({ where: { salaoId, telefone: cleanTel } });
  if (existe) return res.status(400).json({ error: 'Já existe um cliente com este telefone' });

  const cliente = await prisma.cliente.create({
    data: {
      salaoId,
      nome,
      telefone: cleanTel,
      email,
      instagram,
      cpf,
      rg,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      endereco
    }
  });

  res.status(201).json(cliente);
}

async function findOrCreateCliente(salaoId, nome, telefone) {
  try {
    const numero = telefone.replace(/\D/g, '');
    const sufixo = numero.slice(-9);
    const existente = await prisma.cliente.findFirst({ 
      where: { salaoId, telefone: { endsWith: sufixo } } 
    });
    if (existente) return existente.id;
    const novo = await prisma.cliente.create({ data: { salaoId, nome, telefone } });
    return novo.id;
  } catch {
    return null;
  }
}

// ─── AGENDAMENTOS ────────────────────────────────────────────────────────────

async function criarAgendamentoAdmin(req, res) {
  const { servicoId, servicoIds, pacoteId, clienteNome, clienteTelefone, data, hora, observacao, recorrente, semanas } = req.body;
  const profissionalId = getScopedProfessionalId(req, req.body.profissionalId);

  const sIds = servicoIds ? (Array.isArray(servicoIds) ? servicoIds : [servicoIds]) : (servicoId ? [servicoId] : []);
  if (!profissionalId || (sIds.length === 0 && !pacoteId) || !clienteNome || !clienteTelefone || !data || !hora) {
    return res.status(400).json({ error: 'Campos obrigatórios' });
  }

  let totalDuracao = 0;
  let itensData = [];

  if (pacoteId) {
    const pacote = await prisma.pacote.findFirst({ where: { id: pacoteId, salaoId: req.user.salaoId } });
    if (!pacote) return res.status(404).json({ error: 'Pacote não encontrado' });
    const servicoIdsDoPacote = await getServicoIdsDoPacote(pacoteId, req.user.salaoId);
    const profissionalCompativelPacote = await profissionalAtendeTodosServicos(profissionalId, servicoIdsDoPacote, req.user.salaoId);
    if (!profissionalCompativelPacote) {
      return res.status(400).json({ error: 'O profissional selecionado não atende todos os serviços deste pacote' });
    }
    totalDuracao = pacote.duracaoMin;
  } else {
    const servicos = await prisma.servico.findMany({ where: { id: { in: sIds }, salaoId: req.user.salaoId } });
    if (servicos.length === 0) return res.status(404).json({ error: 'Serviços não encontrados' });
    if (servicos.length !== sIds.length) return res.status(404).json({ error: 'Serviços não encontrados' });
    const profissionalCompativelServicos = await profissionalAtendeTodosServicos(profissionalId, sIds, req.user.salaoId);
    if (!profissionalCompativelServicos) {
      return res.status(400).json({ error: 'O profissional selecionado não atende todos os serviços escolhidos' });
    }
    totalDuracao = servicos.reduce((acc, s) => acc + s.duracaoMin, 0);
    itensData = servicos.map(s => ({ servicoId: s.id, nome: s.nome, preco: s.preco, duracaoMin: s.duracaoMin }));
  }

  const [hh, mm] = hora.split(':').map(Number);
  const fimMin = hh * 60 + mm + totalDuracao;
  const fimHora = `${String(Math.floor(fimMin / 60)).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`;

  const clienteId = await findOrCreateCliente(req.user.salaoId, clienteNome, clienteTelefone);

  // Lógica de Recorrência
  const datas = [new Date(data + 'T00:00:00')];
  if (recorrente && semanas > 1) {
    for (let i = 1; i < semanas; i++) {
      const novaData = new Date(datas[0]);
      novaData.setDate(novaData.getDate() + (i * 7));
      datas.push(novaData);
    }
  }

  const agendamentos = await Promise.all(datas.map(d => 
    prisma.agendamento.create({
      data: {
        salaoId: req.user.salaoId,
        profissionalId,
        servicoId: servicoId || (sIds.length === 1 ? sIds[0] : null),
        pacoteId: pacoteId || null,
        clienteId: clienteId || undefined,
        clienteNome,
        clienteTelefone,
        data: d,
        inicioHora: hora,
        fimHora,
        origem: 'admin',
        observacao: recorrente ? `${observacao || ''} (Recorrente)`.trim() : observacao,
        itens: itensData.length > 0 ? { create: itensData } : undefined,
      },
      include: {
        profissional: { select: { id: true, nome: true, comissaoPercent: true } },
        servico: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
        pacote: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
        itens: true,
      },
    })
  ));

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.criar',
    entidade: 'agendamento',
    entidadeId: agendamentos[0]?.id || null,
    mensagem: 'Agendamento criado',
    contexto: { quantidade: agendamentos.length, clienteNome, profissionalId, data, hora },
    req,
  });

  res.status(201).json(agendamentos[0]);
}

async function getAgendamentos(req, res) {
  const { data, status } = req.query;
  const profissionalId = getScopedProfessionalId(req, req.query.profissionalId);
  const where = { salaoId: req.user.salaoId };
  if (profissionalId) where.profissionalId = profissionalId;
  if (status) where.status = status;
  if (data) {
    where.data = { gte: new Date(data + 'T00:00:00'), lte: new Date(data + 'T23:59:59') };
  }

  const agendamentos = await prisma.agendamento.findMany({
    where,
    orderBy: [{ data: 'asc' }, { inicioHora: 'asc' }],
    include: {
      profissional: { select: { id: true, nome: true, fotoUrl: true, comissaoPercent: true } },
      servico: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
      pacote: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
      cliente: { select: { id: true } },
      itens: { orderBy: { createdAt: 'asc' } },
      produtos: { orderBy: { createdAt: 'asc' } },
      pagamentos: true
    },
  });

  let bloqueios = [];
  if (data) {
    bloqueios = await prisma.bloqueio.findMany({
      where: {
        data: { gte: new Date(data + 'T00:00:00'), lte: new Date(data + 'T23:59:59') },
        profissional: {
          salaoId: req.user.salaoId,
          ...(isScopedProfessional(req) ? { id: req.user.profissionalId } : {}),
        }
      },
      include: { profissional: { select: { id: true, nome: true } } }
    });
  }

  res.json({ agendamentos, bloqueios });
}

// ─── LÓGICA INTERNA DE CONCLUSÃO (reutilizável por status e pagamento) ────────

async function getAlertasAgendamento(req, res) {
  const resultado = await listarNotificacoesSalao({
    salaoId: req.user.salaoId,
    userId: req.user.id,
    limit: Number(req.query?.limit || 40),
  });

  res.json(resultado);
}

async function markAlertaAgendamentoLido(req, res) {
  const notificacao = await marcarNotificacaoLida({
    salaoId: req.user.salaoId,
    notificacaoId: req.params.id,
    userId: req.user.id,
  });

  if (!notificacao) {
    return res.status(404).json({ error: 'Notificacao nao encontrada' });
  }

  res.json({ ok: true });
}

async function markTodosAlertasAgendamentoLidos(req, res) {
  const total = await marcarTodasNotificacoesLidas({
    salaoId: req.user.salaoId,
    userId: req.user.id,
  });

  res.json({ ok: true, total });
}

async function getListaEspera(req, res) {
  const { status } = req.query;
  const lista = await prisma.listaEspera.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...(status ? { status } : {}),
      ...professionalScopeFilter(req),
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      servico: { select: { id: true, nome: true, duracaoMin: true, preco: true } },
      profissional: { select: { id: true, nome: true } },
    },
  });
  res.json(lista);
}

async function createListaEspera(req, res) {
  const { clienteNome, clienteTelefone, servicoId, profissionalId, dataDesejada, periodo, observacao } = req.body;
  const profissionalEscopado = getScopedProfessionalId(req, profissionalId);

  if (!clienteNome || !clienteTelefone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }

  const item = await prisma.listaEspera.create({
    data: {
      salaoId: req.user.salaoId,
      clienteNome,
      clienteTelefone,
      servicoId: servicoId || null,
      profissionalId: profissionalEscopado || null,
      dataDesejada: dataDesejada ? new Date(`${dataDesejada}T00:00:00`) : null,
      periodo: periodo || null,
      observacao: observacao || null,
    },
    include: {
      servico: { select: { id: true, nome: true, duracaoMin: true, preco: true } },
      profissional: { select: { id: true, nome: true } },
    },
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.lista_espera.criar',
    entidade: 'lista_espera',
    entidadeId: item.id,
    mensagem: 'Cliente adicionado à lista de espera',
    contexto: { clienteNome, clienteTelefone },
    req,
  });

  res.status(201).json(item);
}

async function updateListaEspera(req, res) {
  const { id } = req.params;
  const { status, observacao, dataDesejada, periodo } = req.body;
  const item = await prisma.listaEspera.findFirst({
    where: {
      id,
      salaoId: req.user.salaoId,
      ...professionalScopeFilter(req),
    },
  });
  if (!item) return res.status(404).json({ error: 'Item da lista de espera não encontrado' });

  const atualizado = await prisma.listaEspera.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(observacao !== undefined && { observacao }),
      ...(periodo !== undefined && { periodo }),
      ...(dataDesejada !== undefined && { dataDesejada: dataDesejada ? new Date(`${dataDesejada}T00:00:00`) : null }),
    },
    include: {
      servico: { select: { id: true, nome: true, duracaoMin: true, preco: true } },
      profissional: { select: { id: true, nome: true } },
    },
  });

  res.json(atualizado);
}

async function deleteListaEspera(req, res) {
  const { id } = req.params;
  await prisma.listaEspera.deleteMany({
    where: {
      id,
      salaoId: req.user.salaoId,
      ...professionalScopeFilter(req),
    },
  });
  res.json({ ok: true });
}

async function executarConclusaoAgendamento(agId, salaoId) {
  const [ag, salao] = await Promise.all([
    prisma.agendamento.findUnique({ 
      where: { id: agId }, 
      include: { servico: true, pacote: true, cliente: true, profissional: true, itens: true, produtos: true } 
    }),
    prisma.salao.findUnique({ where: { id: salaoId } })
  ]);

  if (!ag || ag.status === 'concluido') return { comissaoValor: ag?.comissaoValor ?? 0, saldoRestante: null, fidelidadeGanho: 0, fidelidadeTipo: salao?.fidelidadeTipo };

  const precoBase = ag.servico?.preco ?? ag.pacote?.preco ?? 0;
  const precoItens = ag.itens.reduce((s, i) => s + i.preco, 0);
  const precoProds = ag.produtos.reduce((s, p) => s + (p.preco * p.quantidade), 0);
  const totalAg = precoBase + precoItens + precoProds;

  // 1. Comissão — profissional caixa não recebe comissão
  let comissaoValor = 0;
  const ehCaixa = ag.profissional?.caixa === true;

  if (!ehCaixa) {
    const custoProd = ag.servico?.custoProduto ?? 0;
    const comissoesOver = await prisma.profissionalServico.findMany({
      where: { profissionalId: ag.profissionalId }
    });
    const getComissao = (servId, preco) => {
      const over = comissoesOver.find(c => c.servicoId === servId);
      if (over) {
        if (over.comissaoValor) return over.comissaoValor;
        if (over.comissaoPercent) return (preco * over.comissaoPercent) / 100;
      }
      const globalPerc = ag.profissional?.comissaoPercent ?? 50;
      return (preco * globalPerc) / 100;
    };
    if (ag.servicoId) comissaoValor = getComissao(ag.servicoId, precoBase - custoProd);
    if (ag.itens?.length > 0) {
      for (const item of ag.itens) comissaoValor += getComissao(item.servicoId, item.preco);
    }
  }

  // 2. Fidelidade
  let fidelidadeGanho = 0;
  if (salao?.fidelidadeAtiva && salao.fidelidadeRegra && ag.clienteId) {
    const regra = parseFloat(salao.fidelidadeRegra) || 0;
    fidelidadeGanho = salao.fidelidadeTipo === 'pontos'
      ? Math.floor(totalAg * regra)
      : (totalAg * regra) / 100;
  }

  // 3. Atualizar Cliente
  if (ag.clienteId) {
    await prisma.cliente.update({
      where: { id: ag.clienteId },
      data: {
        lastVisit: new Date(),
        totalVisitas: { increment: 1 },
        totalGasto: { increment: totalAg },
        cashbackSaldo: salao?.fidelidadeTipo === 'cashback' ? { increment: fidelidadeGanho } : undefined,
        pontosSaldo: salao?.fidelidadeTipo === 'pontos' ? { increment: fidelidadeGanho } : undefined,
      }
    });
  }

  // 4. Baixar sessões de pacote
  let saldoRestante = null;
  if (ag.pacoteId && ag.clienteId) {
    const cp = await prisma.clientePacote.findFirst({
      where: { clienteId: ag.clienteId, pacoteId: ag.pacoteId, sessoesRestantes: { gt: 0 } }
    });
    if (cp) {
      await prisma.clientePacote.update({ where: { id: cp.id }, data: { sessoesRestantes: cp.sessoesRestantes - 1 } });
      saldoRestante = cp.sessoesRestantes - 1;
    }
  }

  // 5. Persistir no agendamento
  await prisma.agendamento.update({
    where: { id: agId },
    data: { status: 'concluido', comissaoValor }
  });

  await aplicarConsumoEstoqueDoServico(ag);

  return { comissaoValor, saldoRestante, fidelidadeGanho, fidelidadeTipo: salao?.fidelidadeTipo };
}

async function updateStatusAgendamento(req, res) {
  const { id } = req.params;
  const statusRaw = req.body.status;
  const status = typeof statusRaw === 'object' ? statusRaw.status : statusRaw;
  const salaoId = req.user.salaoId;

  // Verifica se o agendamento pertence ao salão
  const agExiste = await getScopedAgendamento(req, id);
  if (!agExiste) return res.status(404).json({ error: 'Agendamento não encontrado' });

  // Status em_atendimento: apenas muda o status, sem calcular comissão
  if (status === 'em_atendimento' || status === 'cancelado') {
    const updated = await prisma.agendamento.update({
      where: { id },
      data: { status }
    });
    await createAuditLog({
      salaoId: req.user.salaoId,
      usuarioId: req.user.id,
      acao: 'agenda.editar',
      entidade: 'agendamento',
      entidadeId: id,
      mensagem: 'Status de agendamento alterado',
      contexto: { status },
      req,
    });
    return res.json({ ...updated, saldoRestante: null, fidelidadeGanho: 0 });
  }

  if (status === 'concluido') {
    const resultado = await executarConclusaoAgendamento(id, salaoId);
    const updated = await prisma.agendamento.findUnique({ where: { id } });
    await createAuditLog({
      salaoId: req.user.salaoId,
      usuarioId: req.user.id,
      acao: 'agenda.editar',
      entidade: 'agendamento',
      entidadeId: id,
      mensagem: 'Agendamento concluído',
      contexto: { status },
      req,
    });
    return res.json({ ...updated, ...resultado });
  }

  // Fallback: apenas atualiza o status
  const updated = await prisma.agendamento.update({ where: { id }, data: { status } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.editar',
    entidade: 'agendamento',
    entidadeId: id,
    mensagem: 'Status de agendamento alterado',
    contexto: { status },
    req,
  });
  return res.json(updated);
}

async function updateObservacaoAgendamento(req, res) {
  const { id } = req.params;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nao encontrado' });

  const observacaoNormalizada = typeof req.body?.observacao === 'string'
    ? req.body.observacao.trim()
    : '';

  await prisma.agendamento.update({
    where: { id },
    data: {
      observacao: observacaoNormalizada || null,
    },
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.observacao.editar',
    entidade: 'agendamento',
    entidadeId: id,
    mensagem: 'Observacao do agendamento atualizada',
    contexto: { observacaoPreenchida: !!observacaoNormalizada },
    req,
  });

  return res.json(await getAgendamentoCompleto(id));
}

async function reagendarAgendamento(req, res) {
  const { id } = req.params;
  const { data, hora, profissionalId } = req.body;
  const profissionalIdFinal = getScopedProfessionalId(req, profissionalId);
  const original = await getScopedAgendamento(req, id, {
    servico: true,
    pacote: true,
    itens: true,
  });

  if (!original) return res.status(404).json({ error: 'Agendamento não encontrado' });
  if (!data || !hora || !profissionalIdFinal) {
    return res.status(400).json({ error: 'Informe data, horário e profissional para reagendar' });
  }

  const duracao = (original.servico?.duracaoMin ?? original.pacote?.duracaoMin ?? 0)
    + ((original.itens || []).reduce((sum, item) => sum + Number(item.duracaoMin || 0), 0));
  const [hh, mm] = hora.split(':').map(Number);
  const fimMin = (hh * 60) + mm + duracao;
  const fimHora = `${String(Math.floor(fimMin / 60)).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`;

  const novo = await prisma.agendamento.create({
    data: {
      salaoId: req.user.salaoId,
      profissionalId: profissionalIdFinal,
      servicoId: original.servicoId,
      pacoteId: original.pacoteId,
      clienteId: original.clienteId,
      clienteNome: original.clienteNome,
      clienteTelefone: original.clienteTelefone,
      data: new Date(`${data}T00:00:00`),
      inicioHora: hora,
      fimHora,
      observacao: `Reagendado do atendimento ${original.inicioHora} em ${original.data.toISOString().slice(0, 10)}.${original.observacao ? ` ${original.observacao}` : ''}`.trim(),
      reagendadoDeId: original.id,
      itens: original.itens?.length
        ? {
            create: original.itens.map((item) => ({
              servicoId: item.servicoId,
              nome: item.nome,
              preco: item.preco,
              duracaoMin: item.duracaoMin,
            })),
          }
        : undefined,
    },
    include: {
      profissional: { select: { id: true, nome: true, comissaoPercent: true } },
      servico: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
      pacote: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
      itens: true,
      produtos: true,
      pagamentos: true,
    },
  });

  await prisma.agendamento.update({
    where: { id: original.id },
    data: {
      observacao: `${original.observacao || ''}${original.observacao ? ' ' : ''}[Reagendado para ${data} ${hora}]`.trim(),
    },
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.reagendar',
    entidade: 'agendamento',
    entidadeId: novo.id,
    mensagem: 'Agendamento reagendado',
    contexto: { origemId: original.id, data, hora, profissionalId: profissionalIdFinal },
    req,
  });

  res.status(201).json(novo);
}

async function criarVendaPDV(req, res) {
  const { clienteNome, clienteTelefone, produtos, pagamentos } = req.body;
  const salaoId = req.user.salaoId;

  if (!produtos || produtos.length === 0) {
    return res.status(400).json({ error: 'Adicione pelo menos um produto' });
  }

  // Prioriza profissional marcado como caixa; se não houver, cria um automaticamente
  const caixaAberto = await getCaixaAberto(req.user.salaoId);
  if (!caixaAberto) {
    return res.status(400).json({ error: 'Abra o caixa antes de registrar pagamentos ou vendas.' });
  }

  let prof = await prisma.profissional.findFirst({ where: { salaoId, caixa: true } });
  if (!prof) {
    // Cria um profissional "Caixa" dedicado que não recebe comissão
    prof = await prisma.profissional.create({
      data: {
        salaoId,
        nome: 'Caixa (PDV)',
        caixa: true,
        comissaoPercent: 0,
        ativo: true,
      }
    });
  }

  const clienteId = await findOrCreateCliente(salaoId, clienteNome || 'Cliente Balcão', clienteTelefone || '00000000000');

  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  const agendamento = await prisma.agendamento.create({
    data: {
      salaoId,
      profissionalId: prof.id,
      clienteId,
      clienteNome: clienteNome || 'Cliente Balcão',
      clienteTelefone: clienteTelefone || '00000000000',
      data: new Date(agora.toISOString().split('T')[0] + 'T00:00:00'),
      inicioHora: horaAtual,
      fimHora: horaAtual,
      status: 'concluido',
      statusPagamento: 'pago',
      comissaoValor: 0, // Caixa não recebe comissão
      observacao: 'Venda Rápida (PDV)'
    }
  });

  if (pagamentos && pagamentos.length > 0) {
    await prisma.agendamentoPagamento.createMany({
      data: pagamentos.map(p => ({
        agendamentoId: agendamento.id,
        forma: p.forma,
        valor: p.valor
      }))
    });
  }

  for (const item of produtos) {
    const prodDb = await prisma.produto.findUnique({ where: { id: item.id } });
    if (prodDb) {
      await prisma.agendamentoProduto.create({
        data: {
          agendamentoId: agendamento.id,
          produtoId: prodDb.id,
          nome: prodDb.nome,
          preco: prodDb.preco,
          quantidade: item.quantidade
        }
      });
      await prisma.produto.update({
        where: { id: prodDb.id },
        data: { estoque: { decrement: item.quantidade } }
      });
    }
  }

  res.status(201).json(agendamento);
}

async function updatePagamentoAgendamento(req, res) {
  const { id } = req.params;
  const { pagamentos, taxaOperadora } = req.body;
  const salaoId = req.user.salaoId;
  const pagamentosLista = Array.isArray(pagamentos) ? pagamentos : [];
  const totalPagoSolicitado = pagamentosLista.reduce((sum, pagamento) => sum + Number(pagamento?.valor || 0), 0);

  // Segurança: verificar que o agendamento pertence ao salão
  const agExiste = await getScopedAgendamento(req, id);
  if (!agExiste) return res.status(404).json({ error: 'Agendamento não encontrado' });

  if (totalPagoSolicitado > 0) {
    const caixaAberto = await getCaixaAberto(req.user.salaoId);
    if (!caixaAberto) {
      return res.status(400).json({ error: 'Abra o caixa antes de registrar pagamentos ou vendas.' });
    }
  }

  await prisma.agendamentoPagamento.deleteMany({ where: { agendamentoId: id } });

  await Promise.all(pagamentosLista.map(p => 
    prisma.agendamentoPagamento.create({
      data: { agendamentoId: id, forma: p.forma, valor: p.valor }
    })
  ));

  const ag = await prisma.agendamento.findUnique({ 
    where: { id },
    include: { servico: true, pacote: true, itens: true, produtos: true }
  });
  
  const totalDevido = (ag.servico?.preco ?? ag.pacote?.preco ?? 0) + 
                     ag.itens.reduce((s,i) => s + i.preco, 0) + 
                     ag.produtos.reduce((s,p) => s + (p.preco * p.quantidade), 0);
  
  const totalPago = pagamentosLista.reduce((s,p) => s + Number(p.valor || 0), 0);
  const taxa = parseFloat(taxaOperadora) || 0;
  // Valor líquido = total pago menos taxa da maquininha
  const totalLiquido = totalPago - taxa;

  const novoStatusPagamento = totalPago >= totalDevido ? 'pago' 
    : totalPago > 0 ? 'parcial' 
    : 'pendente';

  await prisma.agendamento.update({
    where: { id },
    data: { 
      statusPagamento: novoStatusPagamento,
      taxaOperadora: taxa
    }
  });

  // Se o pagamento for total (ou quase total, tolerância de 0.10 para arredondamentos)
  // E o status ainda não for concluído, concluímos automaticamente.
  let resultado = {};
  if (totalPago >= (totalDevido - 0.1) && ag.status !== 'concluido') {
    resultado = await executarConclusaoAgendamento(id, salaoId);
  }

  const updatedAg = await prisma.agendamento.findUnique({
    where: { id },
    include: { pagamentos: true }
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.pagamento',
    entidade: 'agendamento',
    entidadeId: id,
    mensagem: 'Pagamento de agendamento atualizado',
    contexto: { totalPago, taxa, statusPagamento: novoStatusPagamento },
    req,
  });

  res.json({ ...updatedAg, totalLiquido, ...resultado });
}

async function getAgendamentoCompleto(id) {
  return prisma.agendamento.findUnique({
    where: { id },
    include: {
      profissional: { select: { id: true, nome: true, fotoUrl: true, comissaoPercent: true } },
      servico: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
      pacote: { select: { id: true, nome: true, preco: true, duracaoMin: true } },
      cliente: { select: { id: true } },
      itens: {
        orderBy: { createdAt: 'asc' },
        include: { servico: { select: { id: true, nome: true, preco: true, duracaoMin: true } } }
      },
      produtos: {
        orderBy: { createdAt: 'asc' },
        include: { produto: { select: { id: true, nome: true, preco: true } } }
      },
      pagamentos: true
    }
  });
}

async function deleteAgendamento(req, res) {
  // Segurança: apenas deleta se o agendamento pertencer ao salão do usuário
  const ag = await getScopedAgendamento(req, req.params.id);
  if (!ag) return res.status(404).json({ error: 'Agendamento não encontrado' });
  await prisma.agendamento.delete({ where: { id: req.params.id } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.excluir',
    entidade: 'agendamento',
    entidadeId: req.params.id,
    mensagem: 'Agendamento removido',
    contexto: { clienteNome: ag.clienteNome, data: ag.data, inicioHora: ag.inicioHora },
    req,
  });
  res.json({ ok: true });
}

async function addItemAgendamento(req, res) {
  const { id } = req.params;
  const { servicoId } = req.body;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });

  const allowedServicoIds = await getAllowedServicoIds(req);
  if (allowedServicoIds && !allowedServicoIds.includes(servicoId)) {
    return res.status(403).json({ error: 'VocÃª sÃ³ pode adicionar serviÃ§os vinculados ao seu perfil' });
  }
  const servico = await prisma.servico.findFirst({ where: { id: servicoId, salaoId: req.user.salaoId } });
  if (!servico) return res.status(404).json({ error: 'Serviço não encontrado' });
  await prisma.agendamentoItem.create({
    data: { agendamentoId: id, servicoId, nome: servico.nome, preco: servico.preco, duracaoMin: servico.duracaoMin },
  });
  
  const ag = await prisma.agendamento.findUnique({ 
    where: { id }, 
    include: { servico: true, pacote: true, itens: true } 
  });
  const duracaoTotal = (ag.servico?.duracaoMin ?? ag.pacote?.duracaoMin ?? 0) + 
                      ag.itens.reduce((s, i) => s + i.duracaoMin, 0);
  const [hh, mm] = ag.inicioHora.split(':').map(Number);
  const totalMin = hh * 60 + mm + duracaoTotal;
  const fimHora = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
  await prisma.agendamento.update({ where: { id }, data: { fimHora } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.item.adicionar',
    entidade: 'agendamento_item',
    entidadeId: id,
    mensagem: 'Servico adicional incluido na comanda',
    contexto: {
      agendamentoId: id,
      servicoId,
      servicoNome: servico.nome,
      preco: servico.preco,
    },
    req,
  });

  res.status(201).json(await getAgendamentoCompleto(id));
}

async function removeItemAgendamento(req, res) {
  const { id, itemId } = req.params;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });
  const item = await prisma.agendamentoItem.findFirst({ where: { id: itemId, agendamentoId: id } });
  if (!item) return res.status(404).json({ error: 'Item nÃ£o encontrado' });
  await prisma.agendamentoItem.deleteMany({ where: { id: itemId, agendamentoId: id } });
  
  const ag = await prisma.agendamento.findUnique({ 
    where: { id }, 
    include: { servico: true, pacote: true, itens: true } 
  });
  const duracaoTotal = (ag.servico?.duracaoMin ?? ag.pacote?.duracaoMin ?? 0) + 
                      ag.itens.reduce((s, i) => s + i.duracaoMin, 0);
  const [hh, mm] = ag.inicioHora.split(':').map(Number);
  const totalMin = hh * 60 + mm + duracaoTotal;
  const fimHora = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
  await prisma.agendamento.update({ where: { id }, data: { fimHora } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.item.remover',
    entidade: 'agendamento_item',
    entidadeId: itemId,
    mensagem: 'Servico adicional removido da comanda',
    contexto: {
      agendamentoId: id,
      servicoId: item.servicoId,
      servicoNome: item.nome,
      preco: item.preco,
    },
    req,
  });

  res.json(await getAgendamentoCompleto(id));
}

async function addProdutoAgendamento(req, res) {
  const { id } = req.params;
  const { produtoId, quantidade } = req.body;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });
  const produto = await prisma.produto.findFirst({ where: { id: produtoId, salaoId: req.user.salaoId } });
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
  
  if (produto.estoque < (quantidade || 1)) {
    return res.status(400).json({ error: 'Estoque insuficiente' });
  }

  await prisma.agendamentoProduto.create({
    data: { 
      agendamentoId: id, 
      produtoId, 
      nome: produto.nome, 
      preco: produto.preco, 
      quantidade: quantidade || 1 
    },
  });

  await prisma.produto.update({
    where: { id: produtoId },
    data: { estoque: { decrement: quantidade || 1 } }
  });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.produto.adicionar',
    entidade: 'agendamento_produto',
    entidadeId: id,
    mensagem: 'Produto adicionado a comanda',
    contexto: {
      agendamentoId: id,
      produtoId,
      produtoNome: produto.nome,
      quantidade: quantidade || 1,
      preco: produto.preco,
    },
    req,
  });

  res.status(201).json(await getAgendamentoCompleto(id));
}

async function removeProdutoAgendamento(req, res) {
  const { id, itemId } = req.params;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });
  const item = await prisma.agendamentoProduto.findFirst({ where: { id: itemId, agendamentoId: id } });
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });

  await prisma.produto.update({
    where: { id: item.produtoId },
    data: { estoque: { increment: item.quantidade } }
  });

  await prisma.agendamentoProduto.deleteMany({ where: { id: itemId, agendamentoId: id } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'agenda.produto.remover',
    entidade: 'agendamento_produto',
    entidadeId: itemId,
    mensagem: 'Produto removido da comanda',
    contexto: {
      agendamentoId: id,
      produtoId: item.produtoId,
      produtoNome: item.nome,
      quantidade: item.quantidade,
      preco: item.preco,
    },
    req,
  });
  res.json(await getAgendamentoCompleto(id));
}

// ─── FOTOS E AVALIAÇÕES ──────────────────────────────────────────────────────

async function addFotoAgendamento(req, res) {
  const { id } = req.params;
  const { url } = req.body;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });
  const foto = await prisma.agendamentoFoto.create({ data: { agendamentoId: id, url } });
  res.status(201).json(foto);
}

async function deleteFotoAgendamento(req, res) {
  const agendamento = await getScopedAgendamento(req, req.params.id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });
  await prisma.agendamentoFoto.deleteMany({ where: { id: req.params.fotoId, agendamentoId: req.params.id } });
  res.json({ ok: true });
}

async function submeterAvaliacao(req, res) {
  const { id } = req.params;
  const { avaliacao, comentario } = req.body;
  const agendamento = await getScopedAgendamento(req, id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento nÃ£o encontrado' });
  await prisma.agendamento.update({
    where: { id },
    data: { avaliacao, comentario }
  });
  res.json({ ok: true });
}

async function getAvaliacoes(req, res) {
  const avaliacoes = await prisma.agendamento.findMany({
    where: {
      salaoId: req.user.salaoId,
      avaliacao: { not: null },
      ...professionalScopeFilter(req),
    },
    include: { cliente: { select: { nome: true } }, servico: { select: { nome: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  res.json(avaliacoes);
}

// ─── LEMBRETES AUTOMÁTICOS ──────────────────────────────────────────────────

async function dispararLembretes(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  if (!resolveEvolutionConfig(salao).configured) {
    return res.status(400).json({ error: 'WhatsApp não configurado' });
  }

  const agora = new Date();
  const hojeStr = agora.toISOString().split('T')[0];

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      salaoId: req.user.salaoId,
      data: { gte: new Date(hojeStr + 'T00:00:00'), lte: new Date(hojeStr + 'T23:59:59') },
      status: 'confirmado'
    },
    include: { cliente: true, profissional: true, servico: true }
  });

  let enviados = 0;
  for (const ag of agendamentos) {
    const [h, m] = ag.inicioHora.split(':').map(Number);
    const dataAg = new Date(agora);
    dataAg.setHours(h, m, 0, 0);

    const diffMs = dataAg - agora;
    const diffHoras = diffMs / (1000 * 60 * 60);

    // Se falta entre 1 e 4 horas para o agendamento
    if (diffHoras > 0 && diffHoras <= 4) {
      const msg = `Olá ${ag.clienteNome}! Passando para lembrar do seu horário hoje às *${ag.inicioHora}* com ${ag.profissional.nome}. Te esperamos! ✂️`;
      try {
        await sendEvolutionText(salao, ag.clienteTelefone, msg);
        enviados++;
      } catch (e) { console.error('Erro lembrete:', e.message); }
    }
  }

  res.json({ ok: true, lembretesEnviados: enviados });
}

// ─── IA PROATIVA (RETENÇÃO) ─────────────────────────────────────────────────

async function dispararIAProativa(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  if (!resolveEvolutionConfig(salao).configured) {
    return res.status(400).json({ error: 'WhatsApp não configurado' });
  }

  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const clientesAusentes = await prisma.cliente.findMany({
    where: {
      salaoId: req.user.salaoId,
      lastVisit: { lte: trintaDiasAtras },
      totalVisitas: { gt: 0 }
    }
  });

  let convitesEnviados = 0;
  for (const c of clientesAusentes) {
    const bookingUrl = buildPublicBookingUrl(salao, req);
    const msg = `Oi ${c.nome}! Notamos que faz um tempo que voce nao nos visita. Que tal renovar o visual essa semana? Veja nossos horarios: ${bookingUrl}`;
    try {
      await sendEvolutionText(salao, c.telefone, msg);
      convitesEnviados++;
    } catch (e) {}
  }

  res.json({ ok: true, convitesEnviados });
}

// ─── IMPORTADOR (MIGRAÇÃO SALON99/AGENDA99) ────────────────────────────────

async function importarClientesCSV(req, res) {
  const { dados } = req.body;
  const salaoId = req.user.salaoId;
  let importados = 0;
  let duplicados = 0;

  for (const item of dados) {
    const tel = item.telefone?.replace(/\D/g, '');
    if (!tel) continue;

    const existe = await prisma.cliente.findFirst({ where: { salaoId, telefone: tel } });
    if (existe) {
      duplicados++;
      continue;
    }

    const dataNasc = item.dataNascimento ? new Date(item.dataNascimento) : null;

    await prisma.cliente.create({
      data: {
        salaoId,
        nome:          item.nome          || 'Cliente Importado',
        apelido:       item.apelido        || null,
        telefone:      tel,
        email:         item.email          || null,
        instagram:     item.instagram      || null,
        cpf:           item.cpf            || null,
        rg:            item.rg             || null,
        sexo:          item.sexo           || null,
        dataNascimento: dataNasc && !isNaN(dataNasc) ? dataNasc : null,
        endereco:      item.endereco       || null,
        numero:        item.numero         || null,
        complemento:   item.complemento    || null,
        bairro:        item.bairro         || null,
        cep:           item.cep            || null,
        cidade:        item.cidade         || null,
        estado:        item.estado         || null,
        totalVisitas:  0,
        totalGasto:    0,
      }
    });
    importados++;
  }

  res.json({ ok: true, importados, duplicados });
}




// ─── CLIENTES ────────────────────────────────────────────────────────────────

async function getHistoricoCliente(req, res) {
  const { busca } = req.query;
  if (!busca || busca.trim().length < 2) {
    return res.status(400).json({ error: 'Informe ao menos 2 caracteres para buscar' });
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...professionalScopeFilter(req),
      OR: [
        { clienteNome: { contains: busca, mode: 'insensitive' } },
        { clienteTelefone: { contains: busca } },
      ],
    },
    orderBy: [{ clienteNome: 'asc' }, { data: 'desc' }],
    include: {
      servico: { select: { nome: true, preco: true } },
      pacote: { select: { nome: true, preco: true } },
      profissional: { select: { nome: true } },
    },
  });

  const mapa = {};
  for (const a of agendamentos) {
    const key = a.clienteTelefone;
    if (!mapa[key]) {
      mapa[key] = { nome: a.clienteNome, telefone: a.clienteTelefone, agendamentos: [], totalGasto: 0, visitas: 0 };
    }
    mapa[key].agendamentos.push(a);
    if (a.status === 'concluido') {
      mapa[key].totalGasto += a.servico?.preco ?? a.pacote?.preco ?? 0;
      mapa[key].visitas += 1;
    }
  }

  res.json(Object.values(mapa));
}

// ─── RELATÓRIO ───────────────────────────────────────────────────────────────

async function getRelatorio(req, res) {
  const { inicio, fim } = req.query;

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      salaoId: req.user.salaoId,
      status: 'concluido',
      ...professionalScopeFilter(req),
      data: { gte: new Date(inicio + 'T00:00:00'), lte: new Date(fim + 'T23:59:59') },
    },
    include: {
      servico: { select: { nome: true, preco: true } },
      pacote: { select: { nome: true, preco: true } },
      profissional: { select: { nome: true, comissaoPercent: true } },
    },
    orderBy: { data: 'asc' },
  });

  const total = agendamentos.reduce((acc, a) => acc + (a.servico?.preco ?? a.pacote?.preco ?? 0), 0);
  const totalComissoes = agendamentos.reduce((acc, a) => acc + (a.comissaoValor ?? 0), 0);
  
  const despesas = await prisma.despesa.findMany({
    where: {
      salaoId: req.user.salaoId,
      data: { gte: new Date(inicio + 'T00:00:00'), lte: new Date(fim + 'T23:59:59') }
    }
  });
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);

  const porProfissional = {};
  const porFormaPagamento = {};

  for (const a of agendamentos) {
    const nome = a.profissional.nome;
    const preco = a.servico?.preco ?? a.pacote?.preco ?? 0;

    if (!porProfissional[nome]) porProfissional[nome] = { total: 0, quantidade: 0, comissao: 0 };
    porProfissional[nome].total += preco;
    porProfissional[nome].quantidade += 1;
    porProfissional[nome].comissao += a.comissaoValor ?? 0;

    const forma = a.formaPagamento || 'nao_informado';
    if (!porFormaPagamento[forma]) porFormaPagamento[forma] = { total: 0, quantidade: 0 };
    porFormaPagamento[forma].total += preco;
    porFormaPagamento[forma].quantidade += 1;
  }

  res.json({ 
    total, 
    totalComissoes, 
    totalDespesas,
    lucroReal: total - totalComissoes - totalDespesas,
    quantidade: agendamentos.length, 
    porProfissional, 
    porFormaPagamento, 
    agendamentos,
    despesas 
  });
}

// ─── WHATSAPP / EVOLUTION API ────────────────────────────────────────────────

async function getWhatsappConfig(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  const config = resolveEvolutionConfig(salao);
  res.json({
    evolutionUrl: salao?.evolutionUrl || '',
    evolutionInstance: salao?.evolutionInstance || '',
    hasEvolutionKey: !!salao?.evolutionKey,
    hasGeminiKey: !!salao?.geminiKey,
    effectiveEvolutionUrl: config.baseUrl,
    effectiveEvolutionInstance: config.instanceName,
    usingGlobalApiUrl: config.usingGlobalApiUrl,
    usingGlobalApiKey: config.usingGlobalApiKey,
    usingGlobalInstance: config.usingGlobalInstance,
    hasGlobalEvolutionKey: !!getGlobalEvolutionApiKey(),
    webhookUrl: buildWebhookUrl(req),
  });
}

async function updateWhatsappConfig(req, res) {
  const { evolutionUrl, evolutionKey, evolutionInstance, geminiKey } = req.body;

  const data = {};
  if (evolutionUrl !== undefined) data.evolutionUrl = evolutionUrl;
  if (evolutionInstance !== undefined) data.evolutionInstance = evolutionInstance;
  if (evolutionKey && evolutionKey !== '••••••••') data.evolutionKey = evolutionKey;
  if (geminiKey && geminiKey !== '••••••••') data.geminiKey = geminiKey;

  await prisma.salao.update({ where: { id: req.user.salaoId }, data });

  res.json({ ok: true });
}

async function getWhatsappStatus(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  const status = await getEvolutionStatus(salao, req);
  res.json({
    status: status.status,
    error: status.error || null,
    effectiveEvolutionUrl: status.config?.baseUrl || '',
    effectiveEvolutionInstance: status.config?.instanceName || '',
  });
}

async function connectWhatsapp(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  try {
    const response = await connectEvolutionInstance(salao, req);
    res.json(response);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.response?.data?.message || err.response?.data?.error || err.message });
  }
}

async function disconnectWhatsapp(req, res) {
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });
  if (!resolveEvolutionConfig(salao).configured) {
    return res.status(400).json({ error: 'Nao configurado' });
  }
  try {
    await disconnectEvolutionInstance(salao);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.response?.data?.message || err.response?.data?.error || err.message });
  }
}

async function dispararCampanhaMassiva(req, res) {
  const { telefones, mensagem } = req.body;
  const salao = await prisma.salao.findUnique({ where: { id: req.user.salaoId } });

  if (!telefones?.length || !mensagem) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  if (!resolveEvolutionConfig(salao).configured) {
    return res.status(400).json({ error: 'WhatsApp não configurado' });
  }

  try {
    // Para simplificar, enviamos sequencialmente. Em produção seria melhor uma fila.
    for (const tel of telefones) {
      await sendEvolutionText(salao, tel, mensagem);
    }
    res.json({ ok: true, sent: telefones.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao disparar campanha' });
  }
}

// ─── SENHA ───────────────────────────────────────────────────────────────────

async function updateSenha(req, res) {
  const { senhaAtual, novaSenha } = req.body;
  const usuario = await prisma.usuario.findUnique({ where: { id: req.user.id } });
  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  const ok = await bcrypt.compare(senhaAtual, usuario.senha);
  if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });
  const passwordError = validateStrongPassword(novaSenha);
  if (passwordError) return res.status(400).json({ error: passwordError });
  const hash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({ where: { id: req.user.id }, data: { senha: hash, passwordUpdatedAt: new Date() } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'usuarios.senha.atualizar',
    entidade: 'usuario',
    entidadeId: req.user.id,
    mensagem: 'Senha atualizada pelo próprio usuário',
    req,
  });
  res.json({ ok: true });
}

async function getFinanceiro(req, res) {
  const { inicio, fim } = req.query;
  const salaoId = req.user.salaoId;
  const where = { 
    salaoId, 
    ...professionalScopeFilter(req),
    // Removido o filtro de status: 'concluido' para que pagamentos de agendamentos 
    // ainda não finalizados apareçam no fluxo de caixa
    data: { 
      gte: inicio ? new Date(inicio) : new Date(new Date().setDate(1)), 
      lte: fim ? new Date(fim) : new Date() 
    } 
  };

  const [agendamentosRaw, despesas] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: { pagamentos: true, servico: true, pacote: true, itens: { include: { servico: true } }, produtos: true, profissional: true }
    }),
    prisma.despesa.findMany({
      where: isScopedProfessional(req)
        ? { id: '__no_expenses_for_professional__' }
        : {
            salaoId,
            data: {
              gte: inicio ? new Date(inicio) : new Date(new Date().setDate(1)),
              lte: fim ? new Date(fim) : new Date()
            }
          }
    })
  ]);

  // Filtra apenas agendamentos que de fato tiveram algum pagamento ou estão concluídos
  const agendamentos = agendamentosRaw.filter(a => a.status === 'concluido' || a.pagamentos.length > 0);

  let totalBruto = 0;
  let totalComissoes = 0;
  let totalTaxas = 0;
  let totalDespesas = despesas.reduce((s,d) => s + d.valor, 0);

  const porDia = {};
  const porProfissional = {};
  const porServico = {};

  agendamentos.forEach(ag => {
    const dataKey = ag.data.toISOString().split('T')[0];
    const precoBase = ag.servico?.preco ?? ag.pacote?.preco ?? 0;
    const precoItens = ag.itens.reduce((s,i) => s + i.preco, 0);
    const precoProds = ag.produtos.reduce((s,p) => s + (p.preco * p.quantidade), 0);
    const totalAg = (precoBase + precoItens + precoProds);
    
    totalBruto += totalAg;
    totalComissoes += ag.comissaoValor || 0;
    totalTaxas += ag.taxaOperadora || 0;

    porDia[dataKey] = (porDia[dataKey] || 0) + totalAg;

    if (ag.profissional) {
      const pid = ag.profissionalId;
      if (!porProfissional[pid]) {
        porProfissional[pid] = { id: pid, nome: ag.profissional.nome, bruto: 0, comissao: 0, atendimentos: 0 };
      }
      porProfissional[pid].bruto += totalAg;
      porProfissional[pid].comissao += ag.comissaoValor || 0;
      porProfissional[pid].atendimentos += 1;
    }

    if (ag.servico) {
      porServico[ag.servico.nome] = (porServico[ag.servico.nome] || 0) + ag.servico.preco;
    }
    ag.itens.forEach(item => {
      if (item.servico) {
        porServico[item.servico.nome] = (porServico[item.servico.nome] || 0) + item.preco;
      }
    });
  });

  const chartData = Object.entries(porDia).map(([date, value]) => ({ date, value })).sort((a,b) => a.date.localeCompare(b.date));

  res.json({
    totalBruto,
    totalComissoes,
    totalTaxas,
    totalDespesas,
    lucroLiquido: totalBruto - totalComissoes - totalTaxas - totalDespesas,
    chartData,
    porProfissional: Object.values(porProfissional),
    porServico: Object.entries(porServico).map(([nome, valor]) => ({ nome, valor })),
    qtdAgendamentos: agendamentos.length,
    ticketMedio: agendamentos.length > 0 ? totalBruto / agendamentos.length : 0,
    despesas: despesas.slice(0, 50)
  });
}

async function getCaixaAtual(req, res) {
  const sessao = await prisma.caixaSessao.findFirst({
    where: {
      salaoId: req.user.salaoId,
      status: 'aberto',
    },
    orderBy: { abertoEm: 'desc' },
    include: {
      abertoPor: { select: { id: true, nome: true, email: true } },
      fechadoPor: { select: { id: true, nome: true, email: true } },
      movimentos: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!sessao) return res.json(null);

  const resumo = await buildCaixaResumo({
    salaoId: req.user.salaoId,
    inicio: sessao.abertoEm,
    fim: new Date(),
    profissionalId: isScopedProfessional(req) ? req.user.profissionalId : null,
  });

  res.json({ ...sessao, resumo });
}

async function getCaixaStatusPagamento(req, res) {
  const sessao = await getCaixaAbertoComResumo(req.user.salaoId);
  const dinheiroDisponivel = sessao ? calcularDinheiroDisponivelCaixa(sessao) : 0;
  const permiteSaida = !!sessao && dinheiroDisponivel > 0;
  res.json({
    aberto: !!sessao,
    sessao: sessao ? {
      id: sessao.id,
      turnoNome: sessao.turnoNome,
      abertoEm: sessao.abertoEm,
    } : null,
    mensagem: sessao ? null : 'Abra o caixa antes de registrar pagamentos ou vendas.',
    dinheiroDisponivel,
    permiteSaida,
    mensagemSaida: !sessao
      ? 'Abra o caixa antes de registrar um adiantamento saindo do caixa.'
      : !permiteSaida
        ? 'Nao ha saldo disponivel no caixa. Para este lancamento, use a opcao Conta.'
        : null,
  });
}

async function abrirCaixa(req, res) {
  const { turnoNome, fundoInicial, observacaoAbertura, recebidoDeNome } = req.body;

  const caixaDoOperador = await prisma.caixaSessao.findFirst({
    where: {
      salaoId: req.user.salaoId,
      abertoPorUserId: req.user.id,
      status: 'aberto',
    },
    select: { id: true, turnoNome: true },
  });

  if (caixaDoOperador) {
    return res.status(400).json({ error: 'Este operador jÃ¡ possui um caixa aberto neste momento' });
  }

  const existente = await prisma.caixaSessao.findFirst({
    where: {
      salaoId: req.user.salaoId,
      status: 'aberto',
    },
    select: { id: true },
  });

  if (existente) {
    return res.status(400).json({ error: 'JÃ¡ existe um caixa aberto. FaÃ§a o fechamento antes de abrir outro turno.' });
  }

  const sessao = await prisma.caixaSessao.create({
    data: {
      salaoId: req.user.salaoId,
      abertoPorUserId: req.user.id,
      turnoNome: turnoNome || 'Turno',
      fundoInicial: Number(fundoInicial || 0),
      observacaoAbertura: observacaoAbertura || null,
      recebidoDeNome: recebidoDeNome || null,
    },
    include: {
      abertoPor: { select: { id: true, nome: true, email: true } },
      movimentos: true,
    },
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'financeiro.caixa.abrir',
    entidade: 'caixa_sessao',
    entidadeId: sessao.id,
    mensagem: 'Caixa aberto',
    contexto: { turnoNome: sessao.turnoNome, fundoInicial: sessao.fundoInicial },
    req,
  });

  res.status(201).json(sessao);
}

async function fecharCaixa(req, res) {
  const { id } = req.params;
  const { dinheiroInformado, observacaoFechamento, entregueParaNome, assinaturaFechamento } = req.body;

  if (!assinaturaFechamento || String(assinaturaFechamento).trim().length < 3) {
    return res.status(400).json({ error: 'Informe a assinatura de conferÃªncia para fechar o caixa' });
  }

  const sessao = await prisma.caixaSessao.findFirst({
    where: {
      id,
      salaoId: req.user.salaoId,
      status: 'aberto',
    },
  });

  if (!sessao) {
    return res.status(404).json({ error: 'Caixa aberto nÃ£o encontrado' });
  }

  const resumo = await buildCaixaResumo({
    salaoId: req.user.salaoId,
    inicio: sessao.abertoEm,
    fim: new Date(),
    profissionalId: isScopedProfessional(req) ? req.user.profissionalId : null,
  });

  const dinheiroFinal = Number(dinheiroInformado || 0);
  const esperado = Number(sessao.fundoInicial || 0)
    + Number(resumo.totalDinheiro || 0)
    + Number(resumo.totalSuprimentos || 0)
    - Number(resumo.totalSangrias || 0);
  const diferenca = dinheiroFinal - esperado;

  const atualizado = await prisma.caixaSessao.update({
    where: { id: sessao.id },
    data: {
      status: 'fechado',
      fechadoPorUserId: req.user.id,
      fechadoEm: new Date(),
      dinheiroInformado: dinheiroFinal,
      diferencaDinheiro: diferenca,
      observacaoFechamento: observacaoFechamento || null,
      entregueParaNome: entregueParaNome || null,
      assinaturaFechamento: String(assinaturaFechamento).trim(),
    },
    include: {
      abertoPor: { select: { id: true, nome: true, email: true } },
      fechadoPor: { select: { id: true, nome: true, email: true } },
      movimentos: { orderBy: { createdAt: 'desc' } },
    },
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'financeiro.caixa.fechar',
    entidade: 'caixa_sessao',
    entidadeId: atualizado.id,
    mensagem: 'Caixa fechado',
    contexto: { turnoNome: atualizado.turnoNome, diferenca, dinheiroFinal, esperado },
    req,
  });

  res.json({
    ...atualizado,
    resumo,
    dinheiroEsperado: esperado,
  });
}

async function getCaixaSessoes(req, res) {
  const sessoes = await prisma.caixaSessao.findMany({
    where: { salaoId: req.user.salaoId },
    orderBy: { abertoEm: 'desc' },
    take: 20,
    include: {
      abertoPor: { select: { id: true, nome: true, email: true } },
      fechadoPor: { select: { id: true, nome: true, email: true } },
      movimentos: { orderBy: { createdAt: 'desc' } },
    },
  });

  const enriquecidas = await Promise.all(
    sessoes.map(async (sessao) => {
      const resumo = await buildCaixaResumo({
        salaoId: req.user.salaoId,
        inicio: sessao.abertoEm,
        fim: sessao.fechadoEm || new Date(),
        profissionalId: isScopedProfessional(req) ? req.user.profissionalId : null,
      });

      return {
        ...sessao,
        resumo,
        dinheiroEsperado: Number(sessao.fundoInicial || 0)
          + Number(resumo.totalDinheiro || 0)
          + Number(resumo.totalSuprimentos || 0)
          - Number(resumo.totalSangrias || 0),
      };
    })
  );

  res.json(enriquecidas);
}

async function addMovimentoCaixa(req, res) {
  const { id } = req.params;
  const { tipo, valor, descricao } = req.body;

  if (!['sangria', 'suprimento'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de movimento invÃ¡lido' });
  }

  const sessao = await prisma.caixaSessao.findFirst({
    where: {
      id,
      salaoId: req.user.salaoId,
      status: 'aberto',
    },
    select: { id: true },
  });

  if (!sessao) {
    return res.status(404).json({ error: 'Caixa aberto nÃ£o encontrado' });
  }

  const movimento = await prisma.caixaMovimento.create({
    data: {
      caixaSessaoId: sessao.id,
      tipo,
      valor: Number(valor || 0),
      descricao: descricao || null,
    },
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'financeiro.caixa.movimentar',
    entidade: 'caixa_movimento',
    entidadeId: movimento.id,
    mensagem: 'Movimento de caixa registrado',
    contexto: { tipo, valor: Number(valor || 0), caixaSessaoId: sessao.id },
    req,
  });

  res.status(201).json(movimento);
}

async function getCaixaRelatorioDiario(req, res) {
  const dataBase = req.query.data ? new Date(`${req.query.data}T12:00:00`) : new Date();
  const inicio = new Date(dataBase);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(dataBase);
  fim.setHours(23, 59, 59, 999);

  const sessoes = await prisma.caixaSessao.findMany({
    where: {
      salaoId: req.user.salaoId,
      abertoEm: { lte: fim },
      OR: [
        { fechadoEm: null },
        { fechadoEm: { gte: inicio } },
      ],
    },
    orderBy: { abertoEm: 'asc' },
    include: {
      abertoPor: { select: { nome: true, email: true } },
      fechadoPor: { select: { nome: true, email: true } },
      movimentos: { orderBy: { createdAt: 'asc' } },
    },
  });

  const sessoesEnriquecidas = await Promise.all(
    sessoes.map(async (sessao) => {
      const resumo = await buildCaixaResumo({
        salaoId: req.user.salaoId,
        inicio: sessao.abertoEm > inicio ? sessao.abertoEm : inicio,
        fim: sessao.fechadoEm && sessao.fechadoEm < fim ? sessao.fechadoEm : fim,
        profissionalId: isScopedProfessional(req) ? req.user.profissionalId : null,
      });

      return {
        ...sessao,
        resumo,
        dinheiroEsperado: Number(sessao.fundoInicial || 0)
          + Number(resumo.totalDinheiro || 0)
          + Number(resumo.totalSuprimentos || 0)
          - Number(resumo.totalSangrias || 0),
      };
    })
  );

  const consolidado = sessoesEnriquecidas.reduce((acc, sessao) => {
    acc.totalRecebido += Number(sessao.resumo?.totalRecebido || 0);
    acc.totalDinheiro += Number(sessao.resumo?.totalDinheiro || 0);
    acc.totalSangrias += Number(sessao.resumo?.totalSangrias || 0);
    acc.totalSuprimentos += Number(sessao.resumo?.totalSuprimentos || 0);
    acc.totalDespesas += Number(sessao.resumo?.totalDespesas || 0);
    acc.totalDiferenca += Number(sessao.diferencaDinheiro || 0);
    acc.totalTurnos += 1;

    Object.entries(sessao.resumo?.porForma || {}).forEach(([forma, valor]) => {
      acc.porForma[forma] = (acc.porForma[forma] || 0) + Number(valor || 0);
    });

    return acc;
  }, {
    totalRecebido: 0,
    totalDinheiro: 0,
    totalSangrias: 0,
    totalSuprimentos: 0,
    totalDespesas: 0,
    totalDiferenca: 0,
    totalTurnos: 0,
    porForma: {},
  });

  res.json({
    data: inicio.toISOString().slice(0, 10),
    consolidado,
    sessoes: sessoesEnriquecidas,
  });
}

async function getFechamentoDiario(req, res) {
  const dataBase = req.query.data ? new Date(`${req.query.data}T12:00:00`) : new Date();
  const inicio = new Date(dataBase);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(dataBase);
  fim.setHours(23, 59, 59, 999);

  const [agendamentos, despesas, caixaResumo, auditoriaErros] = await Promise.all([
    prisma.agendamento.findMany({
      where: {
        salaoId: req.user.salaoId,
        ...professionalScopeFilter(req),
        data: { gte: inicio, lte: fim },
      },
      include: {
        pagamentos: true,
      },
    }),
    prisma.despesa.findMany({
      where: isScopedProfessional(req)
        ? { id: '__no_expenses_for_professional__' }
        : {
            salaoId: req.user.salaoId,
            data: { gte: inicio, lte: fim },
          },
    }),
    buildCaixaResumo({
      salaoId: req.user.salaoId,
      inicio,
      fim,
      profissionalId: isScopedProfessional(req) ? req.user.profissionalId : null,
    }),
    prisma.auditLog.count({
      where: {
        salaoId: req.user.salaoId,
        createdAt: { gte: inicio, lte: fim },
        OR: [
          { status: 'failed' },
          { severity: 'error' },
        ],
      },
    }),
  ]);

  const concluidos = agendamentos.filter((item) => item.status === 'concluido');
  const cancelados = agendamentos.filter((item) => item.status === 'cancelado').length;
  const pendentesPagamento = agendamentos.filter((item) => item.statusPagamento !== 'pago').length;
  const comissaoPrevista = concluidos.reduce((sum, item) => sum + Number(item.comissaoValor || 0), 0);
  const totalDespesas = despesas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const saldoFinal = Number(caixaResumo.totalRecebido || 0) - totalDespesas - comissaoPrevista;

  res.json({
    data: inicio.toISOString().slice(0, 10),
    resumo: {
      totalAtendimentos: agendamentos.length,
      concluidos: concluidos.length,
      cancelados,
      pendentesPagamento,
      totalRecebido: caixaResumo.totalRecebido,
      totalDinheiro: caixaResumo.totalDinheiro,
      totalDespesas,
      comissaoPrevista,
      saldoFinal,
      formasPagamento: caixaResumo.porForma,
      errosOperacionais: auditoriaErros,
    },
  });
}

async function getAuditLogs(req, res) {
  const limit = Math.min(Number(req.query.limit || 100), 200);
  const status = req.query.status;
  const severity = req.query.severity;

  const logs = await prisma.auditLog.findMany({
    where: {
      salaoId: req.user.salaoId,
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      usuario: {
        select: { id: true, nome: true, email: true, role: true },
      },
    },
  });

  res.json(logs);
}

async function exportBackup(req, res) {
  const salaoId = req.user.salaoId;
  const [salao, usuarios, profissionais, servicos, produtos, pacotes, clientes] = await Promise.all([
    prisma.salao.findUnique({ where: { id: salaoId } }),
    prisma.usuario.findMany({
      where: { salaoId },
      include: { profissional: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.profissional.findMany({
      where: { salaoId },
      include: { servicos: true, horarios: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.servico.findMany({ where: { salaoId }, orderBy: { nome: 'asc' } }),
    prisma.produto.findMany({ where: { salaoId }, orderBy: { nome: 'asc' } }),
    prisma.pacote.findMany({
      where: { salaoId },
      include: { servicos: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.cliente.findMany({ where: { salaoId }, orderBy: { nome: 'asc' } }),
  ]);

  await createAuditLog({
    salaoId,
    usuarioId: req.user.id,
    acao: 'seguranca.backup.exportar',
    entidade: 'backup',
    entidadeId: salaoId,
    mensagem: 'Backup exportado em JSON',
    req,
  });

  res.json({
    exportedAt: new Date().toISOString(),
    salao,
    usuarios: usuarios.map((usuario) => ({
      ...usuario,
      senha: undefined,
    })),
    profissionais,
    servicos,
    produtos,
    pacotes,
    clientes,
  });
}

async function updateFidelidadeConfig(req, res) {
  const { fidelidadeAtiva, fidelidadeRegra } = req.body;
  const salao = await prisma.salao.update({
    where: { id: req.user.salaoId },
    data: { fidelidadeAtiva, fidelidadeRegra }
  });
  res.json(salao);
}

// ─── USUÁRIOS & ACESSO ──────────────────────────────────────────────────────

async function getUsuarios(req, res) {
  const usuarios = await prisma.usuario.findMany({
    where: { salaoId: req.user.salaoId },
    include: { profissional: true },
    orderBy: { nome: 'asc' }
  });
  res.json(
    usuarios.map((usuario) => ({
      ...usuario,
      permissions: getEffectivePermissions(usuario.role, usuario.permissions),
      actionPermissions: getEffectiveActionPermissions(usuario.role, usuario.actionPermissions),
    }))
  );
}

async function createUsuario(req, res) {
  const { nome, email, senha, role, profissionalId, permissions, actionPermissions } = req.body;

  if (!nome || !email || !senha || !role) {
    return res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios' });
  }

  const passwordError = validateStrongPassword(senha);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedProfissionalId = profissionalId || null;

  try {
    if (normalizedProfissionalId) {
      const profissional = await prisma.profissional.findFirst({
        where: { id: normalizedProfissionalId, salaoId: req.user.salaoId },
      });

      if (!profissional) {
        return res.status(400).json({ error: 'Profissional inválido para este salão' });
      }
    }

    const hash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: {
        salaoId: req.user.salaoId,
        nome,
        email: normalizedEmail,
        senha: hash,
        role,
        profissionalId: normalizedProfissionalId,
        permissions: sanitizePermissions(permissions),
        actionPermissions: sanitizeActionPermissions(actionPermissions),
      },
      include: { profissional: true }
    });

    await createAuditLog({
      salaoId: req.user.salaoId,
      usuarioId: req.user.id,
      acao: 'usuarios.criar',
      entidade: 'usuario',
      entidadeId: usuario.id,
      mensagem: 'Novo login criado',
      contexto: { role, email: normalizedEmail },
      req,
    });

    return res.status(201).json({
      ...usuario,
      permissions: getEffectivePermissions(usuario.role, usuario.permissions),
      actionPermissions: getEffectiveActionPermissions(usuario.role, usuario.actionPermissions),
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
      if (target.includes('email')) {
        return res.status(400).json({ error: 'Já existe um usuário com este e-mail' });
      }
      if (target.includes('profissionalId')) {
        return res.status(400).json({ error: 'Este profissional já possui um login vinculado' });
      }
      return res.status(400).json({ error: 'Registro duplicado' });
    }

    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

async function updateUsuario(req, res) {
  const { id } = req.params;
  const { nome, email, senha, role, profissionalId, ativo, permissions, actionPermissions } = req.body;

  const usuarioExistente = await prisma.usuario.findFirst({
    where: {
      id,
      salaoId: req.user.salaoId,
    },
    select: { id: true },
  });
  if (!usuarioExistente) {
    return res.status(404).json({ error: 'Usuario nao encontrado' });
  }

  const data = {
    nome,
    email: email ? String(email).trim().toLowerCase() : email,
    role,
    profissionalId: profissionalId || null,
    permissions: sanitizePermissions(permissions),
    actionPermissions: sanitizeActionPermissions(actionPermissions),
  };
  if (senha) {
    const passwordError = validateStrongPassword(senha);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    data.senha = await bcrypt.hash(senha, 10);
    data.passwordUpdatedAt = new Date();
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      include: { profissional: true }
    });

    await createAuditLog({
      salaoId: req.user.salaoId,
      usuarioId: req.user.id,
      acao: 'usuarios.editar',
      entidade: 'usuario',
      entidadeId: usuario.id,
      mensagem: 'Login atualizado',
      contexto: { role: usuario.role, email: usuario.email },
      req,
    });

    return res.json({
      ...usuario,
      permissions: getEffectivePermissions(usuario.role, usuario.permissions),
      actionPermissions: getEffectiveActionPermissions(usuario.role, usuario.actionPermissions),
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
      if (target.includes('email')) {
        return res.status(400).json({ error: 'Já existe um usuário com este e-mail' });
      }
      if (target.includes('profissionalId')) {
        return res.status(400).json({ error: 'Este profissional já possui um login vinculado' });
      }
      return res.status(400).json({ error: 'Registro duplicado' });
    }

    console.error('Erro ao atualizar usuário:', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
}

async function deleteUsuario(req, res) {
  const { id } = req.params;
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario || usuario.salaoId !== req.user.salaoId) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  await prisma.usuario.delete({ where: { id } });
  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'usuarios.excluir',
    entidade: 'usuario',
    entidadeId: id,
    mensagem: 'Login removido',
    contexto: { email: usuario.email, role: usuario.role },
    req,
  });
  res.json({ ok: true });
}

// ─── RELATÓRIOS ─────────────────────────────────────────────────────────────

async function getDashboardExecutivo(req, res) {
  const { inicio, fim } = getDateRange(req.query, 30);
  const where = {
    salaoId: req.user.salaoId,
    ...professionalScopeFilter(req),
    data: { gte: inicio, lte: fim },
  };

  const [agendamentos, profissionais, clientes, produtos] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: {
        profissional: {
          include: {
            categorias: {
              include: { categoria: true },
            },
          },
        },
        servico: true,
        pacote: true,
        itens: true,
        produtos: true,
      },
    }),
    prisma.profissional.findMany({
      where: {
        salaoId: req.user.salaoId,
        ativo: true,
        ...(isScopedProfessional(req) ? { id: req.user.profissionalId } : {}),
      },
    }),
    prisma.cliente.findMany({
      where: { salaoId: req.user.salaoId },
      select: { id: true, totalVisitas: true, lastVisit: true },
    }),
    prisma.produto.findMany({
      where: { salaoId: req.user.salaoId },
      select: { id: true, nome: true, estoque: true },
    }),
  ]);

  const concluidos = agendamentos.filter((item) => item.status === 'concluido');
  const cancelados = agendamentos.filter((item) => item.status === 'cancelado').length;
  const noShows = agendamentos.filter((item) => item.status === 'no_show').length;
  const faturamentoTotal = concluidos.reduce((sum, item) => sum + calcularTotalAgendamento(item), 0);
  const ticketMedio = concluidos.length ? faturamentoTotal / concluidos.length : 0;

  const clientesComRetorno = {};
  for (const item of concluidos) {
    const key = item.clienteId || normalizePhone(item.clienteTelefone || '') || item.clienteNome;
    if (!key) continue;
    clientesComRetorno[key] = (clientesComRetorno[key] || 0) + 1;
  }
  const retornoQuantidade = Object.values(clientesComRetorno).filter((quantidade) => quantidade > 1).length;
  const retornoTaxa = Object.keys(clientesComRetorno).length ? Math.round((retornoQuantidade / Object.keys(clientesComRetorno).length) * 100) : 0;

  const diasPeriodo = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const minutosReservados = agendamentos
    .filter((item) => item.status !== 'cancelado')
    .reduce((sum, item) => {
      const base = Number(item.servico?.duracaoMin || item.pacote?.duracaoMin || 0);
      const extras = item.itens?.reduce((acc, extra) => acc + Number(extra.duracaoMin || 0), 0) || 0;
      return sum + base + extras;
    }, 0);
  const capacidade = Math.max(1, profissionais.length) * diasPeriodo * 9 * 60;
  const ocupacao = Math.min(100, Math.round((minutosReservados / capacidade) * 100));

  const produtividadeMap = {};
  const categoriaMap = {};
  for (const item of concluidos) {
    const total = calcularTotalAgendamento(item);
    const profissional = item.profissional;
    if (profissional) {
      if (!produtividadeMap[profissional.id]) {
        produtividadeMap[profissional.id] = {
          id: profissional.id,
          nome: profissional.nome,
          atendimentos: 0,
          faturamento: 0,
          comissao: 0,
        };
      }
      produtividadeMap[profissional.id].atendimentos += 1;
      produtividadeMap[profissional.id].faturamento += total;
      produtividadeMap[profissional.id].comissao += Number(item.comissaoValor || 0);

      const categorias = profissional.categorias?.length
        ? profissional.categorias.map((entry) => entry.categoria?.nome).filter(Boolean)
        : ['Sem categoria'];

      for (const categoria of categorias) {
        categoriaMap[categoria] = (categoriaMap[categoria] || 0) + total;
      }
    }
  }

  const clientesInativos = clientes.filter((cliente) => {
    if (!cliente.lastVisit) return true;
    const diff = Date.now() - new Date(cliente.lastVisit).getTime();
    return diff > (45 * 24 * 60 * 60 * 1000);
  }).length;

  const baixoEstoque = produtos.filter((produto) => Number(produto.estoque || 0) <= 5);

  res.json({
    periodo: {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      dias: diasPeriodo,
    },
    cards: {
      faturamentoTotal,
      ticketMedio,
      concluidos: concluidos.length,
      cancelados,
      noShows,
      ocupacao,
      retornoTaxa,
      clientesInativos,
      baixoEstoque: baixoEstoque.length,
    },
    produtividade: Object.values(produtividadeMap).sort((a, b) => b.faturamento - a.faturamento),
    faturamentoPorCategoria: Object.entries(categoriaMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor),
    alertas: baixoEstoque.slice(0, 6).map((produto) => ({
      tipo: 'estoque',
      nome: produto.nome,
      estoque: produto.estoque,
    })),
  });
}

async function getRelatorioRemuneracao(req, res) {
  const { inicio, fim, profissionalId } = req.query;
  const inicioPeriodo = inicio ? new Date(`${inicio}T00:00:00`) : new Date(new Date().setDate(new Date().getDate() - 30));
  const fimPeriodo = fim ? new Date(`${fim}T23:59:59`) : new Date();
  const where = {
    salaoId: req.user.salaoId,
    status: 'concluido',
    ...professionalScopeFilter(req),
    data: {
      gte: inicioPeriodo,
      lte: fimPeriodo
    }
  };

  if (!isScopedProfessional(req) && profissionalId) where.profissionalId = profissionalId;

  const lancamentosWhere = {
    salaoId: req.user.salaoId,
    ...(isScopedProfessional(req)
      ? { profissionalId: req.user.profissionalId }
      : (profissionalId ? { profissionalId } : {})),
    data: { lte: fimPeriodo },
  };

  const [agendamentos, lancamentosRaw] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: {
        cliente: true,
        profissional: true,
        servico: true,
        itens: { include: { servico: true } },
        produtos: true,
      },
      orderBy: { data: 'desc' }
    }),
    prisma.profissionalLancamento.findMany({
      where: lancamentosWhere,
      include: {
        profissional: true,
        caixaSessao: {
          select: { id: true, turnoNome: true, abertoEm: true },
        },
      },
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const lancamentos = lancamentosRaw
    .map((lancamento) => ({
      ...lancamento,
      saldoAberto: calcularSaldoLancamento(lancamento),
    }))
    .filter((lancamento) => {
      const dataLancamento = new Date(lancamento.data);
      return dataLancamento >= inicioPeriodo || Number(lancamento.saldoAberto || 0) > 0;
    });

  res.json({ agendamentos, lancamentos });
}

async function createLancamentoRemuneracao(req, res) {
  if (isScopedProfessional(req)) {
    return res.status(403).json({ error: 'Somente a administracao pode registrar vales e descontos.' });
  }

  const { profissionalId, tipo, origem, valor, descricao, data } = req.body;
  const tipoNormalizado = String(tipo || '').trim().toLowerCase();
  let origemNormalizada = origem ? String(origem).trim().toLowerCase() : null;
  const valorNumerico = Number(valor || 0);

  if (!profissionalId) {
    return res.status(400).json({ error: 'Selecione um profissional.' });
  }

  if (!['adiantamento', 'desconto'].includes(tipoNormalizado)) {
    return res.status(400).json({ error: 'Tipo de lancamento invalido.' });
  }

  if (valorNumerico <= 0) {
    return res.status(400).json({ error: 'Informe um valor maior que zero.' });
  }

  if (tipoNormalizado === 'adiantamento' && !['caixa', 'conta'].includes(origemNormalizada || '')) {
    return res.status(400).json({ error: 'Informe se o valor saiu do caixa ou da conta.' });
  }

  if (tipoNormalizado === 'desconto') {
    origemNormalizada = null;
  }

  const profissional = await prisma.profissional.findFirst({
    where: {
      id: profissionalId,
      salaoId: req.user.salaoId,
    },
    select: { id: true, nome: true },
  });

  if (!profissional) {
    return res.status(404).json({ error: 'Profissional nao encontrado.' });
  }

  let caixaSessaoId = null;
  if (tipoNormalizado === 'adiantamento' && origemNormalizada === 'caixa') {
    const caixaAberto = await getCaixaAbertoComResumo(req.user.salaoId);
    if (!caixaAberto) {
      return res.status(400).json({ error: 'Abra o caixa antes de registrar um adiantamento saindo do caixa.' });
    }
    const dinheiroDisponivel = calcularDinheiroDisponivelCaixa(caixaAberto);
    if (dinheiroDisponivel <= 0) {
      return res.status(400).json({ error: 'Nao ha saldo disponivel no caixa. Para este lancamento, use a opcao Conta.' });
    }
    if (valorNumerico > dinheiroDisponivel) {
      return res.status(400).json({
        error: `Saldo insuficiente no caixa para este adiantamento. Disponivel: ${formatCurrencyBRL(dinheiroDisponivel)}.`,
      });
    }
    caixaSessaoId = caixaAberto.id;
  }

  const dataLancamento = data ? new Date(`${data}T12:00:00`) : new Date();
  const descricaoNormalizada = String(descricao || '').trim() || null;

  const lancamento = await prisma.$transaction(async (tx) => {
    const criado = await tx.profissionalLancamento.create({
      data: {
        salaoId: req.user.salaoId,
        profissionalId: profissional.id,
        caixaSessaoId,
        tipo: tipoNormalizado,
        origem: origemNormalizada,
        valor: valorNumerico,
        descricao: descricaoNormalizada,
        data: dataLancamento,
      },
      include: {
        profissional: true,
        caixaSessao: {
          select: { id: true, turnoNome: true, abertoEm: true },
        },
      },
    });

    if (caixaSessaoId) {
      await tx.caixaMovimento.create({
        data: {
          caixaSessaoId,
          tipo: 'adiantamento_profissional',
          valor: valorNumerico,
          descricao: descricaoNormalizada || `Adiantamento para ${profissional.nome}`,
        },
      });
    }

    return criado;
  });

  await createAuditLog({
    salaoId: req.user.salaoId,
    usuarioId: req.user.id,
    acao: 'remuneracao.lancamento.criar',
    entidade: 'profissional_lancamento',
    entidadeId: lancamento.id,
    mensagem: 'Vale, adiantamento ou desconto registrado',
    contexto: {
      profissionalId: profissional.id,
      tipo: tipoNormalizado,
      origem: origemNormalizada,
      valor: valorNumerico,
      caixaSessaoId,
    },
    req,
  });

  res.status(201).json({
    ...lancamento,
    saldoAberto: calcularSaldoLancamento(lancamento),
  });
}

async function updateComissaoPaga(req, res) {
  const { ids, paga, profissionalId } = req.body;
  const salaoId = req.user.salaoId;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Lista de IDs inválida' });
  }

  if (paga === false) {
    await prisma.agendamento.updateMany({
      where: {
        id: { in: ids },
        salaoId,
        ...professionalScopeFilter(req)
      },
      data: { comissaoPaga: false }
    });

    return res.json({ ok: true });
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      id: { in: ids },
      salaoId,
      ...professionalScopeFilter(req),
      ...(isScopedProfessional(req) ? {} : (profissionalId ? { profissionalId } : {})),
    },
    select: {
      id: true,
      profissionalId: true,
      comissaoValor: true,
      comissaoPaga: true,
    },
  });

  if (!agendamentos.length) {
    return res.status(404).json({ error: 'Nenhuma comissao encontrada para liquidacao.' });
  }

  const profissionaisIds = [...new Set(agendamentos.map((item) => item.profissionalId).filter(Boolean))];
  if (profissionaisIds.length !== 1) {
    return res.status(400).json({ error: 'Selecione agendamentos de um unico profissional por vez.' });
  }

  const profissionalIdAlvo = profissionaisIds[0];
  const agendamentosPendentes = agendamentos.filter((item) => !item.comissaoPaga);
  const totalComissao = agendamentosPendentes.reduce((sum, item) => sum + Number(item.comissaoValor || 0), 0);
  const agora = new Date();

  const lancamentosAbertos = await prisma.profissionalLancamento.findMany({
    where: {
      salaoId,
      profissionalId: profissionalIdAlvo,
    },
    orderBy: [{ data: 'asc' }, { createdAt: 'asc' }],
  });

  let saldoParaCompensar = totalComissao;
  let totalCompensado = 0;
  const operacoesLancamentos = [];

  for (const lancamento of lancamentosAbertos) {
    const saldoAberto = calcularSaldoLancamento(lancamento);
    if (saldoAberto <= 0 || saldoParaCompensar <= 0) continue;

    const valorCompensar = Math.min(saldoAberto, saldoParaCompensar);
    totalCompensado += valorCompensar;
    saldoParaCompensar -= valorCompensar;

    const novoValorCompensado = Number(lancamento.valorCompensado || 0) + valorCompensar;
    const totalmenteCompensado = (Number(lancamento.valor || 0) - novoValorCompensado) <= 0.0001;

    operacoesLancamentos.push(
      prisma.profissionalLancamento.update({
        where: { id: lancamento.id },
        data: {
          valorCompensado: novoValorCompensado,
          compensadoEm: totalmenteCompensado ? agora : lancamento.compensadoEm,
        },
      })
    );
  }

  await prisma.$transaction([
    prisma.agendamento.updateMany({
      where: {
        id: { in: agendamentosPendentes.map((item) => item.id) },
        salaoId,
        ...professionalScopeFilter(req)
      },
      data: { comissaoPaga: true }
    }),
    ...operacoesLancamentos,
  ]);

  await createAuditLog({
    salaoId,
    usuarioId: req.user.id,
    acao: 'remuneracao.liquidar',
    entidade: 'profissional',
    entidadeId: profissionalIdAlvo,
    mensagem: 'Repasse de comissao liquidado com compensacao de vales e descontos',
    contexto: {
      ids: agendamentosPendentes.map((item) => item.id),
      totalComissao,
      totalCompensado,
      valorLiquidoRepasse: totalComissao - totalCompensado,
    },
    req,
  });

  res.json({
    ok: true,
    profissionalId: profissionalIdAlvo,
    totalComissao,
    totalCompensado,
    valorLiquidoRepasse: totalComissao - totalCompensado,
  });
}

module.exports = {
  getSalao, updateSalao,
  getWhatsappConfig, updateWhatsappConfig, getWhatsappStatus, connectWhatsapp, disconnectWhatsapp,
  getClientes, buscarClientes, createCliente,
  getProfissionais, createProfissional, updateProfissional, deleteProfissional,
  getCategoriasProfissionais, createCategoriaProfissional, deleteCategoriaProfissional,
  setHorarios,
  getServicos, createServico, updateServico, deleteServico,
  getPacotes, createPacote, updatePacote, deletePacote,
  getBloqueios, createBloqueio, deleteBloqueio,
  criarAgendamentoAdmin, getAgendamentos, updateStatusAgendamento, updateObservacaoAgendamento, updatePagamentoAgendamento,
  getAlertasAgendamento, markAlertaAgendamentoLido, markTodosAlertasAgendamentoLidos,
  reagendarAgendamento,
  deleteAgendamento, addItemAgendamento, removeItemAgendamento,
  getListaEspera, createListaEspera, updateListaEspera, deleteListaEspera,
  getProdutos, createProduto, updateProduto, deleteProduto,
  addProdutoAgendamento, removeProdutoAgendamento,
  getDespesas, createDespesa, deleteDespesa,
  addFotoAgendamento, deleteFotoAgendamento,
  submeterAvaliacao, getAvaliacoes,
  dispararLembretes,
  dispararIAProativa,
  importarClientesCSV,
  getHistoricoCliente,
  getRelatorio,
  getFinanceiro,
  getDashboardExecutivo,
  getCaixaAtual,
  getCaixaStatusPagamento,
  abrirCaixa,
  fecharCaixa,
  getCaixaSessoes,
  addMovimentoCaixa,
  getCaixaRelatorioDiario,
  getFechamentoDiario,
  getAuditLogs,
  exportBackup,
  updateFidelidadeConfig,
  dispararCampanhaMassiva,
  updateSenha,
  getUsuarios, createUsuario, updateUsuario, deleteUsuario,
  getRelatorioRemuneracao,
  createLancamentoRemuneracao,
  updateComissaoPaga,
  criarVendaPDV
};
