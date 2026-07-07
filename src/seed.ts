import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import prisma from './config/prisma';

async function seed() {
  console.log('Seeding database...');

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
  console.log('Categories seeded.');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rentnest.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
      },
    });
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('Admin already exists.');
  }

  await prisma.$disconnect();
  console.log('Seed complete!');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
