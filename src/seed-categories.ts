import dotenv from 'dotenv';
dotenv.config();
import prisma from './config/prisma';

async function seed() {
  const categories = [
    { name: 'Apartment', description: 'Apartment units in multi-story buildings' },
    { name: 'House', description: 'Independent houses with private yard' },
    { name: 'Studio', description: 'Open-plan studio apartments' },
    { name: 'Condo', description: 'Condominium units' },
    { name: 'Duplex', description: 'Two-unit residential buildings' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  const all = await prisma.category.findMany();
  console.log('Seeded categories:', all.map((c: any) => c.name).join(', '));
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
