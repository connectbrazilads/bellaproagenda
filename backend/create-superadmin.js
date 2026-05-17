const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@bellapro.com';
  const senha = 'superadmin123';
  
  const hash = await bcrypt.hash(senha, 10);
  
  await prisma.superAdmin.upsert({
    where: { email },
    update: {
      senha: hash,
    },
    create: {
      email,
      senha: hash,
      nome: 'Super Admin BellaPro',
    },
  });

  console.log(`SuperAdmin criado com sucesso!`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${senha}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
