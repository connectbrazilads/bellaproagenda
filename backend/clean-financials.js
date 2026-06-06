const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data limite: 01/06/2026 (fuso horário de Brasília / local da aplicação)
const LIMIT_DATE = new Date('2026-06-01T00:00:00-03:00');

async function main() {
  console.log(`=== INICIANDO LIMPEZA DE DADOS FINANCEIROS ATÉ: ${LIMIT_DATE.toLocaleString('pt-BR')} ===`);
  
  // 1. Contar registros que serão afetados
  const despesasCount = await prisma.despesa.count({
    where: { data: { lt: LIMIT_DATE } }
  });
  
  const caixasCount = await prisma.caixaSessao.count({
    where: { abertoEm: { lt: LIMIT_DATE } }
  });
  
  const lancamentosCount = await prisma.profissionalLancamento.count({
    where: { data: { lt: LIMIT_DATE } }
  });
  
  const agendamentosCount = await prisma.agendamento.count({
    where: { data: { lt: LIMIT_DATE } }
  });

  const comandasCount = await prisma.comanda.count({
    where: { data: { lt: LIMIT_DATE } }
  });

  console.log(`\nRegistros encontrados para deleção:`);
  console.log(`- Despesas (Despesa): ${despesasCount}`);
  console.log(`- Sessões de Caixa (CaixaSessao + movimentos em cascata): ${caixasCount}`);
  console.log(`- Lançamentos de Profissionais (ProfissionalLancamento): ${lancamentosCount}`);
  console.log(`- Agendamentos (Agendamento + pagamentos/itens em cascata): ${agendamentosCount}`);
  console.log(`- Comandas (Comanda): ${comandasCount}`);

  if (despesasCount === 0 && caixasCount === 0 && lancamentosCount === 0 && agendamentosCount === 0 && comandasCount === 0) {
    console.log('\nNenhum dado financeiro encontrado para apagar antes de 01/06/2026.');
    return;
  }

  // Verifica se a flag --execute foi passada
  const execute = process.argv.includes('--execute');
  if (!execute) {
    console.log('\n[AVISO] O script foi executado em modo de simulação (Dry Run).');
    console.log('Para realmente apagar os registros no banco de dados, execute o comando adicionando a flag --execute:');
    console.log('  node clean-financials.js --execute');
    return;
  }

  console.log('\nRealizando deleções no banco de dados...');

  // Executar deleções dentro de uma transação
  await prisma.$transaction(async (tx) => {
    // 1. Limpar self-relations de reagendamento (reagendadoDeId) para evitar violação de chaves estrangeiras
    const agendamentosToDelete = await tx.agendamento.findMany({
      where: { data: { lt: LIMIT_DATE } },
      select: { id: true }
    });
    const agendamentoIds = agendamentosToDelete.map(a => a.id);

    if (agendamentoIds.length > 0) {
      console.log('- Removendo referências de reagendamento...');
      await tx.agendamento.updateMany({
        where: { reagendadoDeId: { in: agendamentoIds } },
        data: { reagendadoDeId: null }
      });
    }

    // 2. Deletar Agendamentos (deleta automaticamente itens, produtos, fotos e pagamentos via CASCADE)
    if (agendamentosCount > 0) {
      console.log('- Deletando agendamentos antigos...');
      await tx.agendamento.deleteMany({
        where: { data: { lt: LIMIT_DATE } }
      });
    }

    // 3. Deletar Comandas
    if (comandasCount > 0) {
      console.log('- Deletando comandas antigas...');
      await tx.comanda.deleteMany({
        where: { data: { lt: LIMIT_DATE } }
      });
    }

    // 4. Deletar Despesas
    if (despesasCount > 0) {
      console.log('- Deletando despesas antigas...');
      await tx.despesa.deleteMany({
        where: { data: { lt: LIMIT_DATE } }
      });
    }

    // 5. Deletar Lançamentos de Profissionais (Comissão, Adiantamentos, Descontos)
    if (lancamentosCount > 0) {
      console.log('- Deletando lançamentos de profissionais antigos...');
      await tx.profissionalLancamento.deleteMany({
        where: { data: { lt: LIMIT_DATE } }
      });
    }

    // 6. Deletar Sessões de Caixa (deleta automaticamente CaixaMovimento via CASCADE)
    if (caixasCount > 0) {
      console.log('- Deletando sessões de caixa antigas...');
      await tx.caixaSessao.deleteMany({
        where: { abertoEm: { lt: LIMIT_DATE } }
      });
    }
  });

  console.log('-> Deleções concluídas no banco de dados!');

  // 7. Recalcular estatísticas dos clientes (totalGasto, totalVisitas, lastVisit)
  console.log('\nRecalculando estatísticas de gastos e visitas de todos os clientes...');
  const clientes = await prisma.cliente.findMany({
    include: {
      agendamentos: {
        where: { status: 'concluido' },
        include: {
          servico: true,
          pacote: true,
          itens: true,
          produtos: true
        }
      }
    }
  });

  let atualizados = 0;
  for (const cliente of clientes) {
    const concluidos = cliente.agendamentos || [];
    const totalVisitas = concluidos.length;
    
    // Calcula o total gasto exatamente do mesmo modo que o backend calcula no adminController
    const totalGasto = concluidos.reduce((sum, ag) => {
      // getAgendamentoPrecoBase
      const precoBaseOriginal = Number(ag.servico?.preco ?? ag.pacote?.preco ?? 0);
      const precoBaseAjustado = ag.valorBaseAjustado;
      const precoBase = (precoBaseAjustado !== null && precoBaseAjustado !== undefined && Number.isFinite(Number(precoBaseAjustado)))
        ? Number(precoBaseAjustado)
        : precoBaseOriginal;
      
      // getAgendamentoItensExtras
      const itensExtras = ag.itens.filter(item => {
        if (!ag.servicoId || !ag.servico || !item.servicoId) return false;
        if (item.servicoId !== ag.servicoId) return false;
        
        const createdAtAgendamento = ag.createdAt ? new Date(ag.createdAt).getTime() : null;
        const createdAtItem = item.createdAt ? new Date(item.createdAt).getTime() : null;
        const createdTogether = createdAtAgendamento && createdAtItem
          ? Math.abs(createdAtItem - createdAtAgendamento) < 60 * 1000
          : false;
          
        return createdTogether
          && Number(item.preco || 0) === Number(ag.servico.preco || 0)
          && Number(item.duracaoMin || 0) === Number(ag.servico.duracaoMin || 0);
      });
      
      const precoItens = itensExtras.reduce((s, item) => s + Number(item.preco || 0), 0);
      const precoProdutos = ag.produtos?.reduce((s, item) => s + (Number(item.preco || 0) * Number(item.quantidade || 0)), 0) || 0;
      
      return sum + precoBase + precoItens + precoProdutos;
    }, 0);

    const sorted = [...concluidos].sort((a, b) => new Date(b.data) - new Date(a.data));
    const lastVisit = sorted[0]?.data || null;

    // Atualiza o cliente se houver discrepância
    const hasChanged = cliente.totalVisitas !== totalVisitas ||
                       cliente.totalGasto !== totalGasto ||
                       (cliente.lastVisit ? cliente.lastVisit.getTime() : null) !== (lastVisit ? lastVisit.getTime() : null);

    if (hasChanged) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          totalVisitas,
          totalGasto,
          lastVisit
        }
      });
      atualizados++;
    }
  }

  console.log(`-> Estatísticas atualizadas para ${atualizados} clientes.`);
  console.log('\n=== PROCESSO CONCLUÍDO COM SUCESSO ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
