import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@gerty.local';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe!123';
  const name = process.env.ADMIN_NAME || 'Super Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
      console.log(`Updated existing user ${email} to ADMIN role.`);
    } else {
      console.log(`Admin already exists: ${email}`);
    }
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', { email: user.email, role: user.role });
  console.log('Use these credentials to login at /login');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
