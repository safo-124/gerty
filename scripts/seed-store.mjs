import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demos = [
  {
    name: 'Tournament Chess Set',
    description: 'Weighted pieces with roll-up vinyl board and carry bag.',
    price: 49.99,
    stock: 10,
    images: [
      { url: 'https://images.unsplash.com/photo-1544070078-a212eda27b8c' },
    ],
  },
  {
    name: 'Wooden Chess Board',
    description: 'Beautiful walnut/maple board, 2.25" squares.',
    price: 89.0,
    stock: 5,
    images: [
      { url: 'https://images.unsplash.com/photo-1618312981687-5c3a2b9588b1' },
    ],
  },
  {
    name: 'Digital Chess Clock',
    description: 'Increment and delay modes, FIDE compliant.',
    price: 39.95,
    stock: 12,
    images: [
      { url: 'https://images.unsplash.com/photo-1542471137100-89d95bbd2b87' },
    ],
  },
  {
    name: 'Strategy Book: Mastering Endgames',
    description: 'Endgame fundamentals with practical examples.',
    price: 24.99,
    stock: 20,
    images: [
      { url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f' },
    ],
  },
];

async function main() {
  for (const d of demos) {
    const existing = await prisma.product.findFirst({ where: { name: d.name } });
    if (existing) {
      console.log(`Exists: ${d.name}`);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        name: d.name,
        description: d.description,
        price: d.price,
        stock: d.stock,
        images: { create: d.images },
      },
    });
    console.log('Created:', created.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
