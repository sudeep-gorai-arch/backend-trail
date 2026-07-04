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
  console.log("🌱 Starting user and role seed...");

  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      description: "System Administrator",
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: "USER",
      description: "Application User",
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@vividwalls.com",
      username: "Administrator",
      passwordHash: await bcrypt.hash("Admin123", 10),
      bio: "Application Administrator",
      authProvider: "LOCAL",
      isPremium: true,
      premiumUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      roleId: adminRole.id,
    },
  });

  await prisma.user.create({
    data: {
      email: "demo@vividwalls.com",
      username: "Demo User",
      passwordHash: await bcrypt.hash("Password123", 10),
      bio: "Wallpaper Lover",
      authProvider: "LOCAL",
      isPremium: false,
      roleId: userRole.id,
    },
  });

  console.log("✅ Roles created: 2");
  console.log("✅ Users created: 2");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });