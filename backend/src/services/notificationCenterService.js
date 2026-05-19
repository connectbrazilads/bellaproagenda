const prisma = require('../lib/prisma');

async function criarNotificacaoSalao({
  salaoId,
  tipo,
  titulo,
  mensagem,
  agendamentoId = null,
  contexto = null,
}) {
  if (!salaoId || !tipo || !titulo || !mensagem) return null;

  return prisma.salaoNotificacao.create({
    data: {
      salaoId,
      tipo,
      titulo,
      mensagem,
      agendamentoId,
      contexto,
    },
  });
}

async function listarNotificacoesSalao({ salaoId, userId, limit = 40 }) {
  const [items, unreadCount] = await Promise.all([
    prisma.salaoNotificacao.findMany({
      where: { salaoId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.salaoNotificacao.count({
      where: {
        salaoId,
        ...(userId ? { NOT: { lidaPorUserIds: { has: userId } } } : {}),
      },
    }),
  ]);

  return {
    items,
    unreadCount,
  };
}

async function marcarNotificacaoLida({ salaoId, notificacaoId, userId }) {
  if (!salaoId || !notificacaoId || !userId) return null;

  const notificacao = await prisma.salaoNotificacao.findFirst({
    where: { id: notificacaoId, salaoId },
  });

  if (!notificacao) return null;
  if (notificacao.lidaPorUserIds.includes(userId)) return notificacao;

  return prisma.salaoNotificacao.update({
    where: { id: notificacaoId },
    data: { lidaPorUserIds: { push: userId } },
  });
}

async function marcarTodasNotificacoesLidas({ salaoId, userId }) {
  if (!salaoId || !userId) return 0;

  const pendentes = await prisma.salaoNotificacao.findMany({
    where: {
      salaoId,
      NOT: { lidaPorUserIds: { has: userId } },
    },
    select: { id: true },
  });

  if (pendentes.length === 0) return 0;

  await Promise.all(
    pendentes.map((item) =>
      prisma.salaoNotificacao.update({
        where: { id: item.id },
        data: { lidaPorUserIds: { push: userId } },
      })
    )
  );

  return pendentes.length;
}

module.exports = {
  criarNotificacaoSalao,
  listarNotificacoesSalao,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
};
