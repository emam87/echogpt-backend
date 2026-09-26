import { PrismaClient, PlanName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Roles
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  console.log('Roles seeded:', { userRole, adminRole });

  // 2. Seed Plans (FREE: 20/day, PREMIUM: 500/day)
  const freePlan = await prisma.plan.upsert({
    where: { name: PlanName.FREE },
    update: { dailyRequestLimit: 20 },
    create: {
      name: PlanName.FREE,
      dailyRequestLimit: 20,
      price: 0,
    },
  });

  const premiumPlan = await prisma.plan.upsert({
    where: { name: PlanName.PREMIUM },
    update: { dailyRequestLimit: 500 },
    create: {
      name: PlanName.PREMIUM,
      dailyRequestLimit: 500,
      price: 10,
    },
  });

  console.log('Plans seeded:', { freePlan, premiumPlan });

  // 3. Seed Admin User
  const adminEmail = 'admin@echogpt.com';
  const adminPasswordHash = await argon2.hash('Admin@123456');

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: adminRole.id,
      isEmailVerified: true,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      isEmailVerified: true,
      roleId: adminRole.id,
    },
  });

  console.log('Admin user seeded:', { id: adminUser.id, email: adminUser.email });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
