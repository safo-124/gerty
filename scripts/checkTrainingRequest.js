const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.trainingRequest.count();
    console.log('TrainingRequest count:', count);
  } catch (error) {
    console.error('Error querying TrainingRequest:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
