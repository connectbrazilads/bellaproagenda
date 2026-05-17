const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'teste@teste.com.br';
  const u = await prisma.usuario.findUnique({ where: { email } });
  console.log(JSON.stringify(u, null, 2));
}

main().finally(() => prisma.$disconnect());
