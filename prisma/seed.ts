import { PrismaClient, PlanName, ProviderType } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptApiKey(plainText: string): string {
  const hexKey =
    process.env.ENCRYPTION_KEY ||
    'aa317266922ab5e9d0c0dd358b0034eaa4b9114b77136b9189b5ceb0b6c56962';
  const keyBuffer = Buffer.from(hexKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  return `${ivHex}:${authTag}:${encrypted}`;
}

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

  // 4. Seed System Claude Provider if CLAUDE_API_KEY is present
  const claudeKey = process.env.CLAUDE_API_KEY;
  if (claudeKey) {
    const encrypted = encryptApiKey(claudeKey);
    const existingProvider = await prisma.aiProvider.findFirst({
      where: { userId: null, type: ProviderType.CLAUDE },
    });

    if (existingProvider) {
      const updated = await prisma.aiProvider.update({
        where: { id: existingProvider.id },
        data: {
          encryptedApiKey: encrypted,
          isEnabled: true,
          isDefault: true,
          model: 'claude-3-5-sonnet-20241022',
        },
      });
      console.log('System Claude Provider updated:', updated.id);
    } else {
      const created = await prisma.aiProvider.create({
        data: {
          userId: null,
          type: ProviderType.CLAUDE,
          name: 'System Claude 3.5 Sonnet',
          model: 'claude-3-5-sonnet-20241022',
          encryptedApiKey: encrypted,
          isEnabled: true,
          isDefault: true,
        },
      });
      console.log('System Claude Provider created:', created.id);
    }
  }
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
