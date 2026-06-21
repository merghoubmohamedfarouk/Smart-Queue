const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default admin and services...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // Default Services
  try {
    await prisma.service.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        nom: 'General Service',
        description: 'Default queuing service'
      }
    });
    console.log('✅ Default Service created.');
  } catch(e) { console.log('Skipping service seeding (or already exists).'); }

  // Admin
  try {
    await prisma.admin.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        nom: 'Super Admin',
        email: 'admin@test.com',
        password: passwordHash
      }
    });
    console.log('✅ Admin user created: admin@test.com / 123456');
  } catch(e) { console.log('Admin already exists.'); }

}

main()
  .catch((e) => {
    console.error('❌ Failed to seed database. Is XAMPP MySQL running and did you run `npx prisma db push`?');
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
