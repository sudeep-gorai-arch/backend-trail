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

const avatarImg = (file: string) =>
  `/uploads/wallpapers/users/${file}.webp`;

async function main() {
  console.log("🌱 Starting user seed...");

  // ==========================================
  // DELETE DATA
  // Keep only fresh user table entries
  // ==========================================

  await prisma.subscription.deleteMany();

  await prisma.wallpaperVariant.deleteMany();

  await prisma.wallpaperTag.deleteMany();

  await prisma.wallpaperLike.deleteMany();

  await prisma.download.deleteMany();

  await prisma.favorite.deleteMany();

  await prisma.wallpaper.deleteMany();

  await prisma.tag.deleteMany();

  await prisma.category.deleteMany();

  await prisma.userSession.deleteMany();

  await prisma.user.deleteMany();

  await prisma.role.deleteMany();

  console.log("✅ Old data removed");

  // ==========================================
  // USERS ONLY
  // ==========================================

  const admin = await prisma.user.create({
    data: {
      email: "admin@vividwalls.com",

      username: "Administrator",

      passwordHash: await bcrypt.hash("Admin123", 10),

      avatarUrl: avatarImg("admin"),

      bio: "Application Administrator",

      authProvider: "LOCAL",

      isPremium: true,

      premiumUntil: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 365
      ),
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@vividwalls.com",

      username: "Demo User",

      passwordHash: await bcrypt.hash("Password123", 10),

      avatarUrl: avatarImg("demo"),

      bio: "Wallpaper Lover",

      authProvider: "LOCAL",

      isPremium: true,

      premiumUntil: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 365
      ),
    },
  });

  console.log("✅ Users created");

  console.log("");
  console.log("=====================================");
  console.log("🌱 Database Seeded Successfully");
  console.log("=====================================");
  console.log(`Users : 2`);
  console.log(`Admin : ${admin.email}`);
  console.log(`Demo  : ${demoUser.email}`);
  console.log("=====================================");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });