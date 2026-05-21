const prisma = require('./prisma');

function getServicoIdsDoProfissional(profissional) {
  const ids = new Set();

  for (const item of profissional?.servicos || []) {
    if (item?.servicoId) ids.add(item.servicoId);
  }

  for (const vinculo of profissional?.servicoCategorias || []) {
    for (const servico of vinculo?.categoria?.servicos || []) {
      if (servico?.id) ids.add(servico.id);
      if (servico?.servicoId) ids.add(servico.servicoId);
    }
  }

  return [...ids];
}

async function getServicoIdsDoPacote(pacoteId, salaoId) {
  const pacote = await prisma.pacote.findFirst({
    where: { id: pacoteId, salaoId },
    include: {
      servicos: {
        select: { servicoId: true },
      },
    },
  });

  if (!pacote) return null;
  return pacote.servicos.map((item) => item.servicoId);
}

async function getProfissionalComServicos(profissionalId, salaoId) {
  return prisma.profissional.findFirst({
    where: { id: profissionalId, salaoId, ativo: true },
    select: {
      id: true,
      servicos: {
        select: { servicoId: true },
      },
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
}

async function profissionalAtendeTodosServicos(profissionalId, servicoIds, salaoId) {
  if (!profissionalId) return false;

  const idsUnicos = [...new Set((servicoIds || []).filter(Boolean))];
  if (idsUnicos.length === 0) return true;

  const profissional = await getProfissionalComServicos(profissionalId, salaoId);
  if (!profissional) return false;

  const servicosDoProfissional = new Set(getServicoIdsDoProfissional(profissional));
  return idsUnicos.every((servicoId) => servicosDoProfissional.has(servicoId));
}

module.exports = {
  getServicoIdsDoPacote,
  getProfissionalComServicos,
  getServicoIdsDoProfissional,
  profissionalAtendeTodosServicos,
};
