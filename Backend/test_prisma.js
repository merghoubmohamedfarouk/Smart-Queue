const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Running Prisma Diagnostic...");
  try {
    const count = await prisma.ticket.count({ where: { serviceId: 1 } });
    console.log("Current ticket count:", count);
    
    const ticket = await prisma.ticket.create({
      data: {
        numero: count + 1,
        statut: "EN_ATTENTE",
        clientId: null,
        serviceId: 1
      }
    });
    console.log("Successfully created ticket:", ticket);
  } catch (e) {
    console.error("Prisma Failure trace:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
