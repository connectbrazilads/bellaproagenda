const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const salaoId = 'salao-principal';

  await prisma.salao.upsert({
    where: { slug: 'salao-principal' },
    update: {
      nome: 'Salao de Beleza',
      telefone: '(11) 99999-9999',
      endereco: 'Rua das Flores, 123 - Sao Paulo/SP',
      whatsapp: '5511999999999',
    },
    create: {
      id: salaoId,
      nome: 'Salao de Beleza',
      slug: 'salao-principal',
      corPrimaria: '#7c3aed',
      telefone: '(11) 99999-9999',
      endereco: 'Rua das Flores, 123 - Sao Paulo/SP',
      whatsapp: '5511999999999',
    },
  });

  const hash = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@salao.com' },
    update: {
      salaoId,
      nome: 'Admin Principal',
      senha: hash,
      role: 'admin',
    },
    create: {
      salaoId,
      nome: 'Admin Principal',
      email: 'admin@salao.com',
      senha: hash,
      role: 'admin',
    },
  });

  const ana = await prisma.profissional.upsert({
    where: { id: 'prof-ana' },
    update: {
      salaoId,
      nome: 'Ana Silva',
      bio: 'Especialista em coloracao e cortes femininos',
    },
    create: {
      id: 'prof-ana',
      salaoId,
      nome: 'Ana Silva',
      bio: 'Especialista em coloracao e cortes femininos',
    },
  });

  const carlos = await prisma.profissional.upsert({
    where: { id: 'prof-carlos' },
    update: {
      salaoId,
      nome: 'Carlos Souza',
      bio: 'Barbeiro profissional com 10 anos de experiencia',
    },
    create: {
      id: 'prof-carlos',
      salaoId,
      nome: 'Carlos Souza',
      bio: 'Barbeiro profissional com 10 anos de experiencia',
    },
  });

  const julia = await prisma.profissional.upsert({
    where: { id: 'prof-julia' },
    update: {
      salaoId,
      nome: 'Julia Costa',
      bio: 'Manicure e pedicure, unhas em gel e acrigel',
    },
    create: {
      id: 'prof-julia',
      salaoId,
      nome: 'Julia Costa',
      bio: 'Manicure e pedicure, unhas em gel e acrigel',
    },
  });

  const corte = await prisma.servico.upsert({
    where: { id: 'srv-corte' },
    update: { salaoId, nome: 'Corte Feminino', duracaoMin: 60, preco: 80 },
    create: { id: 'srv-corte', salaoId, nome: 'Corte Feminino', duracaoMin: 60, preco: 80 },
  });

  const coloracao = await prisma.servico.upsert({
    where: { id: 'srv-coloracao' },
    update: { salaoId, nome: 'Coloracao', duracaoMin: 120, preco: 180 },
    create: { id: 'srv-coloracao', salaoId, nome: 'Coloracao', duracaoMin: 120, preco: 180 },
  });

  const corteBarba = await prisma.servico.upsert({
    where: { id: 'srv-corte-barba' },
    update: { salaoId, nome: 'Corte + Barba', duracaoMin: 60, preco: 70 },
    create: { id: 'srv-corte-barba', salaoId, nome: 'Corte + Barba', duracaoMin: 60, preco: 70 },
  });

  const manicure = await prisma.servico.upsert({
    where: { id: 'srv-manicure' },
    update: { salaoId, nome: 'Manicure', duracaoMin: 60, preco: 45 },
    create: { id: 'srv-manicure', salaoId, nome: 'Manicure', duracaoMin: 60, preco: 45 },
  });

  const pedicure = await prisma.servico.upsert({
    where: { id: 'srv-pedicure' },
    update: { salaoId, nome: 'Pedicure', duracaoMin: 60, preco: 55 },
    create: { id: 'srv-pedicure', salaoId, nome: 'Pedicure', duracaoMin: 60, preco: 55 },
  });

  const vinculos = [
    { profissionalId: ana.id, servicoId: corte.id },
    { profissionalId: ana.id, servicoId: coloracao.id },
    { profissionalId: carlos.id, servicoId: corteBarba.id },
    { profissionalId: julia.id, servicoId: manicure.id },
    { profissionalId: julia.id, servicoId: pedicure.id },
  ];

  for (const vinculo of vinculos) {
    await prisma.profissionalServico.upsert({
      where: { profissionalId_servicoId: vinculo },
      update: {},
      create: vinculo,
    });
  }

  const diasUteis = [1, 2, 3, 4, 5];
  const profissionais = [ana, carlos, julia];

  for (const profissional of profissionais) {
    for (const dia of diasUteis) {
      await prisma.horario.upsert({
        where: { id: `hor-${profissional.id}-${dia}` },
        update: {
          profissionalId: profissional.id,
          diaSemana: dia,
          inicioHora: '09:00',
          fimHora: '18:00',
          intervaloMin: 30,
        },
        create: {
          id: `hor-${profissional.id}-${dia}`,
          profissionalId: profissional.id,
          diaSemana: dia,
          inicioHora: '09:00',
          fimHora: '18:00',
          intervaloMin: 30,
        },
      });
    }

    await prisma.horario.upsert({
      where: { id: `hor-${profissional.id}-6` },
      update: {
        profissionalId: profissional.id,
        diaSemana: 6,
        inicioHora: '09:00',
        fimHora: '14:00',
        intervaloMin: 30,
      },
      create: {
        id: `hor-${profissional.id}-6`,
        profissionalId: profissional.id,
        diaSemana: 6,
        inicioHora: '09:00',
        fimHora: '14:00',
        intervaloMin: 30,
      },
    });
  }

  console.log('Seed concluido!');
  console.log('Admin: admin@salao.com / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
