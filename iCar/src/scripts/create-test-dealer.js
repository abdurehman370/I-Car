
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'testdealer@example.com';
  const password = await bcrypt.hash('password123', 10);

  const dealer = await prisma.dealer.upsert({
    where: { email },
    update: {
      password,
      approvalStatus: 'approved'
    },
    create: {
      email,
      password,
      dealershipName: 'Test Dealership',
      contactPerson: 'Test Person',
      phoneNumber: '1234567890',
      approvalStatus: 'approved'
    }
  });

  console.log('Dealer created/updated:', dealer);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
