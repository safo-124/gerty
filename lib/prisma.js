// Import PrismaClient from the custom generated output (see prisma/schema.prisma -> generator output)
import { PrismaClient } from '../app/generated/prisma/index.js';

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
