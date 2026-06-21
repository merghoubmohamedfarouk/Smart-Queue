const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding default Service ID 1...");
  try {
    const s = await prisma.service.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        nom: "General Service",
        description: "Default queuing service"
      }
    });
    console.log("✅ Service seeded:", s.nom);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}
seed();
