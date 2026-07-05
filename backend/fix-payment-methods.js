const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getAgendamentoPrecoBaseOriginal(agendamento) {
  return Number(agendamento?.servico?.preco ?? agendamento?.pacote?.preco ?? 0);
}

function getAgendamentoPrecoBase(agendamento) {
  const precoBaseOriginal = getAgendamentoPrecoBaseOriginal(agendamento);
  const precoBaseAjustado = agendamento?.valorBaseAjustado;

  if (precoBaseAjustado === null || precoBaseAjustado === undefined) {
    return precoBaseOriginal;
  }

  const precoBaseAjustadoNumero = Number(precoBaseAjustado);
  return Number.isFinite(precoBaseAjustadoNumero) ? precoBaseAjustadoNumero : precoBaseOriginal;
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

function calcularTotalAgendamento(agendamento) {
  const precoBase = getAgendamentoPrecoBase(agendamento);
  const precoItens = getAgendamentoItensExtras(agendamento).reduce((sum, item) => sum + Number(item.preco || 0), 0);
  const precoProdutos = agendamento?.produtos?.reduce((sum, item) => sum + (Number(item.preco || 0) * Number(item.quantidade || 0)), 0) || 0;
  return precoBase + precoItens + precoProdutos;
}

async function main() {
  console.log('Iniciando script de ajuste dos pagamentos e formas de pagamento...');
  
  const agendamentos = await prisma.agendamento.findMany({
    where: {
      status: 'concluido'
    },
    include: {
      pagamentos: true,
      servico: true,
      pacote: true,
      itens: true,
      produtos: true
    }
  });

  console.log(`Encontrados ${agendamentos.length} agendamentos concluídos no banco de dados.`);

  // Agrupar por cliente e data (dia)
  const grupos = {};
  agendamentos.forEach(ag => {
    if (!ag.clienteId) return;
    const dataStr = new Date(ag.data).toISOString().split('T')[0];
    const chave = `${ag.clienteId}_${dataStr}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(ag);
  });

  let totalAjustados = 0;

  for (const [chave, ags] of Object.entries(grupos)) {
    // Agregar todos os pagamentos do grupo
    const allPayments = [];
    ags.forEach(ag => {
      allPayments.push(...ag.pagamentos);
    });

    if (ags.length > 1) {
      if (allPayments.length > 0) {
        // Deletar os pagamentos antigos desse grupo para redistribuir
        const agIds = ags.map(a => a.id);
        await prisma.agendamentoPagamento.deleteMany({
          where: { agendamentoId: { in: agIds } }
        });

        // Somar os pagamentos agrupando por forma
        const paymentSums = {};
        allPayments.forEach(p => {
          paymentSums[p.forma] = (paymentSums[p.forma] || 0) + Number(p.valor || 0);
        });

        const totalDevido = ags.reduce((sum, ag) => sum + calcularTotalAgendamento(ag), 0);

        const paymentPromises = [];
        const formasDesteAgMap = {};

        Object.entries(paymentSums).forEach(([forma, totalValor]) => {
          let valorAcumulado = 0;
          ags.forEach((ag, index) => {
            const valorAg = calcularTotalAgendamento(ag);
            let valorProporcional;
            if (index === ags.length - 1) {
              valorProporcional = Number((totalValor - valorAcumulado).toFixed(2));
            } else {
              const proporcao = totalDevido > 0 ? (valorAg / totalDevido) : 0;
              valorProporcional = Number((totalValor * proporcao).toFixed(2));
              valorAcumulado += valorProporcional;
            }

            if (valorProporcional > 0) {
              if (!formasDesteAgMap[ag.id]) formasDesteAgMap[ag.id] = new Set();
              formasDesteAgMap[ag.id].add(forma);

              paymentPromises.push(
                prisma.agendamentoPagamento.create({
                  data: {
                    agendamentoId: ag.id,
                    forma,
                    valor: valorProporcional
                  }
                })
              );
            }
          });
        });

        await Promise.all(paymentPromises);

        // Atualizar campo formaPagamento no agendamento
        for (const ag of ags) {
          const formas = formasDesteAgMap[ag.id] ? [...formasDesteAgMap[ag.id]].join(', ') : null;
          await prisma.agendamento.update({
            where: { id: ag.id },
            data: { formaPagamento: formas }
          });
        }

        totalAjustados += ags.length;
        console.log(`Grupo ${chave}: redistribuídos pagamentos para ${ags.length} agendamentos.`);
      }
    } else {
      // Grupo de um único agendamento: apenas garante que o campo formaPagamento está preenchido se houver pagamentos
      const ag = ags[0];
      if (allPayments.length > 0) {
        const formas = [...new Set(allPayments.map(p => p.forma))].join(', ') || null;
        if (ag.formaPagamento !== formas) {
          await prisma.agendamento.update({
            where: { id: ag.id },
            data: { formaPagamento: formas }
          });
          totalAjustados++;
        }
      }
    }
  }

  console.log(`Processamento concluído. Ajustados ${totalAjustados} agendamentos.`);
}

main()
  .catch(e => {
    console.error('Erro ao executar o script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
