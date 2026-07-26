import "dotenv/config";

import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting safe user and role seed...");

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {
      description: "System Administrator",
    },
    create: {
      name: "ADMIN",
      description: "System Administrator",
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {
      description: "Application User",
    },
    create: {
      name: "USER",
      description: "Application User",
    },
  });

  const adminPasswordHash = await bcrypt.hash("Admin123", 10);
  const demoPasswordHash = await bcrypt.hash("Password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@vividwalls.com" },
    update: {
      username: "Administrator",
      bio: "Application Administrator",
      authProvider: "LOCAL",
      isPremium: true,
      roleId: adminRole.id,
    },
    create: {
      email: "admin@vividwalls.com",
      username: "Administrator",
      passwordHash: adminPasswordHash,
      bio: "Application Administrator",
      authProvider: "LOCAL",
      isPremium: true,
      premiumUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@vividwalls.com" },
    update: {
      username: "Demo User",
      bio: "Wallpaper Lover",
      authProvider: "LOCAL",
      roleId: userRole.id,
    },
    create: {
      email: "demo@vividwalls.com",
      username: "Demo User",
      passwordHash: demoPasswordHash,
      bio: "Wallpaper Lover",
      authProvider: "LOCAL",
      isPremium: false,
      roleId: userRole.id,
    },
  });

  console.log("✅ Roles and seed users are present.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });