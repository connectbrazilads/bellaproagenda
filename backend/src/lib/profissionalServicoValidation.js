const prisma = require('./prisma');

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

async function profissionalAtendeTodosServicos(profissionalId, servicoIds, salaoId) {
  if (!profissionalId) return false;

  const idsUnicos = [...new Set((servicoIds || []).filter(Boolean))];
  if (idsUnicos.length === 0) return true;

  const profissional = await prisma.profissional.findFirst({
    where: { id: profissionalId, salaoId, ativo: true },
    select: {
      id: true,
      servicos: {
        select: { servicoId: true },
      },
    },
  });

  if (!profissional) return false;

  const servicosDoProfissional = new Set(profissional.servicos.map((item) => item.servicoId));
  return idsUnicos.every((servicoId) => servicosDoProfissional.has(servicoId));
}

module.exports = {
  getServicoIdsDoPacote,
  profissionalAtendeTodosServicos,
};
