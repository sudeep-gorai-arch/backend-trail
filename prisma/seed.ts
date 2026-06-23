import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});


const prisma = new PrismaClient({
  adapter,
});


const img = (seed: string) =>
  `https://picsum.photos/seed/${seed}/800/1400`;


const CATEGORIES = [
  {
    name: "Anime",
    slug: "anime",
    icon: "happy-outline",
  },
  {
    name: "Sports",
    slug: "sports",
    icon: "football-outline",
  },
  {
    name: "Nature",
    slug: "nature",
    icon: "leaf-outline",
  },
  {
    name: "Cars",
    slug: "cars",
    icon: "car-sport-outline",
  },
  {
    name: "Abstract",
    slug: "abstract",
    icon: "color-palette-outline",
  },
  {
    name: "City",
    slug: "city",
    icon: "business-outline",
  },
  {
    name: "Space",
    slug: "space",
    icon: "planet-outline",
  },
  {
    name: "Gaming",
    slug: "gaming",
    icon: "game-controller-outline",
  },
  {
    name: "Animals",
    slug: "animals",
    icon: "paw-outline",
  },
];


const WALLPAPERS = [

  {
    title: "Majestic Lion",
    category: "animals",
    seed: "lion",
    premium: true,
    featured: true,
    likes: 12500
  },

  {
    title: "Wolf Moon",
    category: "animals",
    seed: "wolf",
    premium: false,
    featured: false,
    likes: 5600
  },

  {
    title: "Cyber Samurai",
    category: "anime",
    seed: "samurai",
    premium: true,
    featured: true,
    likes: 15200
  },

  {
    title: "Anime Warrior",
    category: "anime",
    seed: "anime-warrior",
    premium: false,
    featured: false,
    likes: 8200
  },

  {
    title: "Galaxy Dream",
    category: "space",
    seed: "galaxy",
    premium: true,
    featured: true,
    likes: 22000
  },

  {
    title: "Mars Explorer",
    category: "space",
    seed: "mars",
    premium: false,
    featured: false,
    likes: 7300
  },

  {
    title: "Alpine Mirror",
    category: "nature",
    seed: "mountain",
    premium: false,
    featured: true,
    likes: 9800
  },

  {
    title: "Rain Forest",
    category: "nature",
    seed: "forest",
    premium: true,
    featured: false,
    likes: 11200
  },

  {
    title: "Neon Racer",
    category: "cars",
    seed: "sport-car",
    premium: false,
    featured: true,
    likes: 7600
  },

  {
    title: "Luxury Beast",
    category: "cars",
    seed: "supercar",
    premium: true,
    featured: false,
    likes: 16500
  },

  {
    title: "Football Arena",
    category: "sports",
    seed: "football",
    premium: false,
    featured: false,
    likes: 6500
  },

  {
    title: "Basketball Fire",
    category: "sports",
    seed: "basketball",
    premium: true,
    featured: false,
    likes: 8700
  },

  {
    title: "Liquid Aura",
    category: "abstract",
    seed: "abstract",
    premium: false,
    featured: true,
    likes: 6100
  },

  {
    title: "Dark Waves",
    category: "abstract",
    seed: "dark-wave",
    premium: true,
    featured: false,
    likes: 9400
  },

  {
    title: "Tokyo Night",
    category: "city",
    seed: "tokyo",
    premium: true,
    featured: true,
    likes: 19000
  },

  {
    title: "New York Lights",
    category: "city",
    seed: "newyork",
    premium: false,
    featured: false,
    likes: 7800
  },

  {
    title: "Gaming Warrior",
    category: "gaming",
    seed: "gaming",
    premium: true,
    featured: false,
    likes: 8900
  },

  {
    title: "Cyber Controller",
    category: "gaming",
    seed: "controller",
    premium: false,
    featured: false,
    likes: 4300
  }

];


async function main() {


  console.log("🌱 Start seed");


  //
  // CLEAR DATA
  //

  await prisma.subscription.deleteMany();

  await prisma.wallpaperLike.deleteMany();

  await prisma.download.deleteMany();

  await prisma.favorite.deleteMany();

  await prisma.wallpaper.deleteMany();

  await prisma.category.deleteMany();

  await prisma.user.deleteMany();

  await prisma.role.deleteMany();





  //
  // ROLES
  //

  const adminRole = await prisma.role.create({

    data: {
      name: "ADMIN"
    }

  });


  const userRole = await prisma.role.create({

    data: {
      name: "USER"
    }

  });


  //
  // USERS
  //

  const admin =
    await prisma.user.create({

      data: {

        email: "admin@vividwalls.app",

        username: "Admin",

        passwordHash:
          await bcrypt.hash(
            "Admin123",
            10
          ),

        avatarUrl:
          img("admin"),

        bio:
          "Application administrator",

        isPremium: true,


        roleId:
          adminRole.id

      }

    });



  const user =
    await prisma.user.create({

      data: {

        email:
          "demo@vividwalls.app",

        username:
          "Ethan Hunt",

        passwordHash:
          await bcrypt.hash(
            "Password123",
            10
          ),

        bio:
          "Wallpaper lover ✨",

        avatarUrl:
          img("avatar"),

        isPremium: true,


        premiumUntil:
          new Date(
            Date.now()
            +
            1000 * 60 * 60 * 24 * 365
          ),


        roleId:
          userRole.id

      }

    });


  //
  // CATEGORY
  //

  const categoryMap =
    new Map<string, string>();


  for (const c of CATEGORIES) {


    const category =
      await prisma.category.create({

        data: c

      });


    categoryMap.set(
      c.slug,
      category.id
    );


  }



  //
  // WALLPAPER
  //

  const created: any[] = [];


  for (const w of WALLPAPERS) {


    const wallpaper =
      await prisma.wallpaper.create({

        data: {

          title: w.title,


          description:
            "Premium HD wallpaper",


          imageUrl:
            img(w.seed),


          thumbnailUrl:
            img(w.seed),


          quality:
            w.premium
              ?
              "8K"
              :
              "4K",


          resolution:
            w.premium
              ?
              "7680x4320"
              :
              "3840x2160",


          isPremium:
            w.premium,


          isFeatured:
            w.featured,


          likes:
            w.likes,


          downloadCount:
            Math.floor(
              Math.random() * 9000
            ),


          categoryId:
            categoryMap.get(w.category)!

        }

      });


    created.push(wallpaper);


  }



  //
  // FAVORITES
  //

  await prisma.favorite.createMany({

    data: [

      {
        userId: user.id,
        wallpaperId: created[0].id
      },

      {
        userId: user.id,
        wallpaperId: created[2].id
      }

    ]

  });


  //
  // LIKES
  //

  await prisma.wallpaperLike.create({

    data: {

      userId: user.id,

      wallpaperId: created[0].id

    }

  });


  //
  // DOWNLOAD HISTORY
  //

  await prisma.download.createMany({

    data: [

      {
        userId: user.id,
        wallpaperId: created[0].id,
        quality: "8K"
      },

      {
        userId: user.id,
        wallpaperId: created[2].id,
        quality: "4K"
      }

    ]

  });


  //
  // PREMIUM SUBSCRIPTION
  //

  await prisma.subscription.create({

    data: {

      userId: user.id,

      plan: "annual",

      platform: "android",

      purchaseToken:
        "demo-token",

      startDate: new Date(),

      endDate:
        new Date(
          Date.now()
          +
          1000 * 60 * 60 * 24 * 365
        ),

      active: true

    }

  });


  console.log("✅ Seed completed");


}



main()
  .catch(e => {

    console.error(e);

    process.exit(1);

  })
  .finally(async () => {

    await prisma.$disconnect();

  });