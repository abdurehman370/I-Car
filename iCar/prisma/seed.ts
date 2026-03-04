import 'dotenv/config';
import prisma from '../src/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log({ user });

  // --- Seed Car Taxonomy ---
  console.log('Seeding car taxonomy...');
  const taxonomyPath = path.resolve(__dirname, '../../scrapper/data/car_taxonomy.json');
  if (fs.existsSync(taxonomyPath)) {
    const taxonomyData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
    const makesData = taxonomyData.makes || {};

    for (const [makeName, makeData] of Object.entries(makesData)) {
      const data = makeData as { models?: Record<string, string[]>; special_labels?: unknown };
      const models = data.models || {};

      const make = await prisma.carMake.upsert({
        where: { name: makeName },
        update: {},
        create: { name: makeName },
      });

      for (const [modelName, variants] of Object.entries(models)) {
        const variantList = Array.isArray(variants) ? variants : [];
        const model = await prisma.carModel.upsert({
          where: {
            makeId_name: {
              makeId: make.id,
              name: modelName,
            },
          },
          update: {},
          create: {
            name: modelName,
            makeId: make.id,
          },
        });

        for (const variantName of variantList) {
          await prisma.carVariant.upsert({
            where: {
              modelId_name: {
                modelId: model.id,
                name: variantName,
              },
            },
            update: {},
            create: {
              name: variantName,
              modelId: model.id,
            },
          });
        }
      }
    }
    console.log('Car taxonomy seeded successfully.');
  } else {
    console.error(`Taxonomy file not found at ${taxonomyPath}`);
  }

  await prisma.$disconnect();
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
