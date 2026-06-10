const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Removes test transactional data before the client's official start date.
// Preserves master data: clients, professionals, services, products, packages,
// categories, users, and uploaded files used by those records.
const LIMIT_DATE = new Date('2026-06-01T00:00:00-03:00');

function printCount(label, count) {
  console.log(`- ${label}: ${count}`);
}

function isDuplicateBaseItem(agendamento, item) {
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

function calculateAgendamentoTotal(agendamento) {
  const precoBaseOriginal = Number(agendamento?.servico?.preco ?? agendamento?.pacote?.preco ?? 0);
  const precoBaseAjustado = agendamento?.valorBaseAjustado;
  const precoBase = precoBaseAjustado !== null
    && precoBaseAjustado !== undefined
    && Number.isFinite(Number(precoBaseAjustado))
    ? Number(precoBaseAjustado)
    : precoBaseOriginal;
  const precoItens = (agendamento.itens || [])
    .filter((item) => !isDuplicateBaseItem(agendamento, item))
    .reduce((sum, item) => sum + Number(item.preco || 0), 0);
  const precoProdutos = (agendamento.produtos || [])
    .reduce((sum, item) => sum + (Number(item.preco || 0) * Number(item.quantidade || 0)), 0);

  return precoBase + precoItens + precoProdutos;
}

async function collectCounts() {
  const agendamentosToDelete = await prisma.agendamento.findMany({
    where: { data: { lt: LIMIT_DATE } },
    select: { id: true },
  });
  const agendamentoIds = agendamentosToDelete.map((item) => item.id);

  const caixasToDelete = await prisma.caixaSessao.findMany({
    where: { abertoEm: { lt: LIMIT_DATE } },
    select: { id: true },
  });
  const caixaSessaoIds = caixasToDelete.map((item) => item.id);

  const [
    agendamentosCount,
    agendamentoPagamentosCount,
    agendamentoItensCount,
    agendamentoProdutosCount,
    agendamentoFotosCount,
    comandasCount,
    bloqueiosCount,
    despesasCount,
    caixasCount,
    caixaMovimentosCount,
    lancamentosCount,
    notificacoesAgendamentoCount,
  ] = await Promise.all([
    prisma.agendamento.count({ where: { id: { in: agendamentoIds } } }),
    prisma.agendamentoPagamento.count({ where: { agendamentoId: { in: agendamentoIds } } }),
    prisma.agendamentoItem.count({ where: { agendamentoId: { in: agendamentoIds } } }),
    prisma.agendamentoProduto.count({ where: { agendamentoId: { in: agendamentoIds } } }),
    prisma.agendamentoFoto.count({ where: { agendamentoId: { in: agendamentoIds } } }),
    prisma.comanda.count({ where: { data: { lt: LIMIT_DATE } } }),
    prisma.bloqueio.count({ where: { data: { lt: LIMIT_DATE } } }),
    prisma.despesa.count({ where: { data: { lt: LIMIT_DATE } } }),
    prisma.caixaSessao.count({ where: { id: { in: caixaSessaoIds } } }),
    prisma.caixaMovimento.count({ where: { caixaSessaoId: { in: caixaSessaoIds } } }),
    prisma.profissionalLancamento.count({ where: { data: { lt: LIMIT_DATE } } }),
    prisma.salaoNotificacao.count({ where: { agendamentoId: { in: agendamentoIds } } }),
  ]);

  return {
    agendamentoIds,
    caixaSessaoIds,
    agendamentosCount,
    agendamentoPagamentosCount,
    agendamentoItensCount,
    agendamentoProdutosCount,
    agendamentoFotosCount,
    comandasCount,
    bloqueiosCount,
    despesasCount,
    caixasCount,
    caixaMovimentosCount,
    lancamentosCount,
    notificacoesAgendamentoCount,
  };
}

function printPreview(counts) {
  console.log('\nTransactional records found for removal:');
  printCount('Agendamentos', counts.agendamentosCount);
  printCount('Pagamentos de agendamento (cascade)', counts.agendamentoPagamentosCount);
  printCount('Itens extras de agendamento (cascade)', counts.agendamentoItensCount);
  printCount('Produtos vendidos em agendamento (cascade; product catalog remains)', counts.agendamentoProdutosCount);
  printCount('Fotos anexadas em agendamento (cascade; professional/catalog photos remain)', counts.agendamentoFotosCount);
  printCount('Comandas', counts.comandasCount);
  printCount('Bloqueios de agenda', counts.bloqueiosCount);
  printCount('Despesas', counts.despesasCount);
  printCount('Sessoes de caixa', counts.caixasCount);
  printCount('Movimentos de caixa (cascade)', counts.caixaMovimentosCount);
  printCount('Lancamentos de profissionais/remuneracao', counts.lancamentosCount);
  printCount('Notificacoes vinculadas aos agendamentos removidos', counts.notificacoesAgendamentoCount);

  console.log('\nPreserved data: clients, professionals, services, products, packages, categories, users, and uploads.');
}

function totalCount(counts) {
  return counts.agendamentosCount
    + counts.agendamentoPagamentosCount
    + counts.agendamentoItensCount
    + counts.agendamentoProdutosCount
    + counts.agendamentoFotosCount
    + counts.comandasCount
    + counts.bloqueiosCount
    + counts.despesasCount
    + counts.caixasCount
    + counts.caixaMovimentosCount
    + counts.lancamentosCount
    + counts.notificacoesAgendamentoCount;
}

async function deleteTransactionalData(counts) {
  await prisma.$transaction(async (tx) => {
    if (counts.agendamentoIds.length > 0) {
      console.log('- Removing notifications linked to old appointments...');
      await tx.salaoNotificacao.deleteMany({
        where: { agendamentoId: { in: counts.agendamentoIds } },
      });

      console.log('- Clearing reschedule references...');
      await tx.agendamento.updateMany({
        where: { reagendadoDeId: { in: counts.agendamentoIds } },
        data: { reagendadoDeId: null },
      });

      console.log('- Deleting old appointments...');
      await tx.agendamento.deleteMany({
        where: { id: { in: counts.agendamentoIds } },
      });
    }

    if (counts.comandasCount > 0) {
      console.log('- Deleting old comandas...');
      await tx.comanda.deleteMany({
        where: { data: { lt: LIMIT_DATE } },
      });
    }

    if (counts.bloqueiosCount > 0) {
      console.log('- Deleting old schedule blocks...');
      await tx.bloqueio.deleteMany({
        where: { data: { lt: LIMIT_DATE } },
      });
    }

    if (counts.despesasCount > 0) {
      console.log('- Deleting old expenses...');
      await tx.despesa.deleteMany({
        where: { data: { lt: LIMIT_DATE } },
      });
    }

    if (counts.lancamentosCount > 0) {
      console.log('- Deleting old professional/remuneration entries...');
      await tx.profissionalLancamento.deleteMany({
        where: { data: { lt: LIMIT_DATE } },
      });
    }

    if (counts.caixaSessaoIds.length > 0) {
      console.log('- Deleting old cash register sessions...');
      await tx.caixaSessao.deleteMany({
        where: { id: { in: counts.caixaSessaoIds } },
      });
    }
  });
}

async function recalculateClientStats() {
  console.log('\nRecalculating client stats from remaining appointments...');
  const clientes = await prisma.cliente.findMany({
    include: {
      agendamentos: {
        where: { status: 'concluido' },
        include: {
          servico: true,
          pacote: true,
          itens: true,
          produtos: true,
        },
      },
    },
  });

  let updated = 0;
  for (const cliente of clientes) {
    const concluidos = cliente.agendamentos || [];
    const totalVisitas = concluidos.length;
    const totalGasto = concluidos.reduce((sum, agendamento) => sum + calculateAgendamentoTotal(agendamento), 0);
    const sorted = [...concluidos].sort((a, b) => new Date(b.data) - new Date(a.data));
    const lastVisit = sorted[0]?.data || null;

    const changed = cliente.totalVisitas !== totalVisitas
      || Number(cliente.totalGasto || 0) !== totalGasto
      || (cliente.lastVisit ? cliente.lastVisit.getTime() : null) !== (lastVisit ? lastVisit.getTime() : null);

    if (changed) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          totalVisitas,
          totalGasto,
          lastVisit,
        },
      });
      updated++;
    }
  }

  console.log(`-> Client stats updated: ${updated}`);
}

async function main() {
  const execute = process.argv.includes('--execute');

  console.log(`=== TEST DATA CLEANUP BEFORE: ${LIMIT_DATE.toLocaleString('pt-BR')} ===`);
  const counts = await collectCounts();
  printPreview(counts);

  if (totalCount(counts) === 0) {
    console.log('\nNo transactional data found before 01/06/2026.');
    return;
  }

  if (!execute) {
    console.log('\n[DRY RUN] Nothing was deleted.');
    console.log('To delete for real, run:');
    console.log('  node clean-financials.js --execute');
    return;
  }

  console.log('\nExecuting deletion transaction...');
  await deleteTransactionalData(counts);
  console.log('-> Deletion completed.');

  await recalculateClientStats();
  console.log('\n=== CLEANUP COMPLETED SUCCESSFULLY ===');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
