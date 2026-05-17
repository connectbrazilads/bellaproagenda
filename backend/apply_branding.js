const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  await prisma.salao.update({
    where: { slug: 'teste' },
    data: {
      corPrimaria: '#d946ef',
      corSecundaria: '#701a75',
      bannerUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1920',
      bannerTexto: 'O seu momento de beleza e bem-estar começa aqui.',
      tema: 'dark'
    }
  });
  console.log('Branding do salão teste atualizado!');
}
test().catch(console.error).finally(() => prisma.$disconnect());
