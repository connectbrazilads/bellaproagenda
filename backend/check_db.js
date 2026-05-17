const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const saloes = await prisma.salao.findMany({
      include: {
        _count: {
          select: {
            profissionais: true,
            clientes: true,
            agendamentos: true,
            servicos: true,
            usuarios: true,
          },
        },
        usuarios: { select: { email: true, nome: true }, take: 1 },
        agendamentos: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    console.log('Salões encontrados:', saloes.length);
    console.log('Dados do primeiro salão:', JSON.stringify(saloes[0], null, 2));
  } catch (e) {
    console.error('ERRO NA QUERY:', e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
