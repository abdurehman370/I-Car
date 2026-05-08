import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';

dotenv.config();

const prismaClientSingleton = () => {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
};

const prisma = prismaClientSingleton();

async function main() {
  const images = await prisma.listingImage.findMany({ take: 5 });
  console.log(JSON.stringify(images, null, 2));
}

main();
