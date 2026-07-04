import { Prisma, WallpaperQuality } from "@prisma/client";

import prisma from "../config/prisma";

import { ApiError } from "../utils/ApiError";

import path from "path";
import { Storage } from "../utils/storage";

import {
  createCategoryFolders,
  getWallpaperPaths,
  moveFile,
} from "../utils/storage";

import { processWallpaper } from "../utils/imageProcessor";

import { generateChecksum } from "../utils/checksum";

import { randomFileName } from "../utils/slug";

import {
  generateUniqueSlug,
} from "../utils/slug";

import fs from "fs/promises";

// ======================================================
// TYPES
// ======================================================

export interface ListWallpaperParams {
  limit: number;

  offset: number;

  search?: string;

  category?: string;

  premium?: boolean;

  featured?: boolean;

  active?: boolean;

  quality?: WallpaperQuality;

  sort?:
  | "latest"
  | "popular"
  | "downloads"
  | "likes"
  | "featured";
}

export interface CreateWallpaperInput {
  title: string;

  description?: string | null;

  categoryId: string;

  quality?: WallpaperQuality;

  isPremium?: boolean | string;

  isFeatured?: boolean | string;

  tags?: string[];
}

export interface UpdateWallpaperInput {
  title?: string;

  description?: string | null;

  categoryId?: string;

  quality?: WallpaperQuality;

  isPremium?: boolean | string;

  isFeatured?: boolean | string;

  active?: boolean | string;

  tags?: string[];
}

// ======================================================
// PRISMA INCLUDE
// ======================================================

const wallpaperInclude = {
  category: true,

  wallpaperVariants: {
    orderBy: {
      type: "asc",
    },
  },

  wallpaperTags: {
    include: {
      tag: true,
    },
  },

  _count: {
    select: {
      favorites: true,
    },
  },
} satisfies Prisma.WallpaperInclude;

// ======================================================
// MAPPER
// ======================================================

const mapWallpaper = (
  wallpaper: Prisma.WallpaperGetPayload<{
    include: typeof wallpaperInclude;
  }>
) => wallpaper;

// ======================================================
// HELPERS
// ======================================================

async function getCategory(
  categoryId: string
) {
  const category =
    await prisma.category.findUnique({
      where: {
        id: categoryId,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        folderName: true,
      },
    });

  if (!category) {
    throw ApiError.notFound(
      "Category not found."
    );
  }

  return category;
}

function buildSearchableText(
  title: string,
  description?: string | null,
  category?: string,
  tags: string[] = []
) {
  return [
    title,
    description,
    category,
    ...tags,
  ]
    .filter(Boolean)
    .join(" ");
}

async function incrementCategoryCount(
  categoryId: string
) {
  await prisma.category.update({
    where: {
      id: categoryId,
    },

    data: {
      wallpaperCount: {
        increment: 1,
      },
    },
  });
}

async function decrementCategoryCount(
  categoryId: string
) {
  await prisma.category.update({
    where: {
      id: categoryId,
    },

    data: {
      wallpaperCount: {
        decrement: 1,
      },
    },
  });
}

function toBoolean(
  value: unknown,
  fallback = false
): boolean {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "off"
    ) {
      return false;
    }
  }

  return Boolean(value);
}

function toOptionalBoolean(
  value: unknown
): boolean | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  return toBoolean(value);
}

function createWallpaperData(
  data: CreateWallpaperInput,
  slug: string,
  image: {
    originalPath: string;
    displayPath: string;
    thumbnailPath: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    extension: string;
    width: number;
    height: number;
    aspectRatio: number;
    originalSize: number;
    displaySize: number;
    thumbnailSize: number;
    checksum?: string | null;
    blurHash?: string | null;
    dominantColor?: string | null;
  },
  searchableText: string
): Prisma.WallpaperCreateInput {
  const isPremium =
    toBoolean(data.isPremium, false);

  const isFeatured =
    toBoolean(data.isFeatured, false);

  return {
    title: data.title.trim(),

    slug,

    description: data.description,

    category: {
      connect: {
        id: data.categoryId,
      },
    },

    originalPath: image.originalPath,

    displayPath: image.displayPath,

    thumbnailPath: image.thumbnailPath,

    originalName: image.originalName,

    fileName: image.fileName,

    mimeType: image.mimeType,

    extension: image.extension,

    width: image.width,

    height: image.height,

    aspectRatio: image.aspectRatio,

    originalSize: image.originalSize,

    displaySize: image.displaySize,

    thumbnailSize: image.thumbnailSize,

    quality:
      data.quality ??
      WallpaperQuality.UHD_4K,

    format: "webp",

    checksum: image.checksum,

    blurHash: image.blurHash,

    dominantColor: image.dominantColor,

    searchableText,

    isPremium,

    isFeatured,

    featuredAt:
      isFeatured
        ? new Date()
        : null,

    status: "READY",
  };
}

async function createWallpaperVariants(
  wallpaperId: string,
  data: {
    originalPath: string;
    displayPath: string;
    thumbnailPath: string;
    width: number;
    height: number;
    originalSize: number;
    displaySize: number;
    thumbnailSize: number;
  }
) {
  await prisma.wallpaperVariant.createMany({
    data: [
      {
        wallpaperId,

        type: "ORIGINAL",

        url: data.originalPath,

        width: data.width,

        height: data.height,

        size: data.originalSize,

        compressionQuality: 95,

        isDefault: false,
      },

      {
        wallpaperId,

        type: "DISPLAY",

        url: data.displayPath,

        width: Math.min(data.width, 1440),

        height: Math.round(
          (Math.min(data.width, 1440) *
            data.height) /
          data.width
        ),

        size: data.displaySize,

        compressionQuality: 82,

        isDefault: true,
      },

      {
        wallpaperId,

        type: "THUMBNAIL",

        url: data.thumbnailPath,

        width: Math.min(data.width, 400),

        height: Math.round(
          (Math.min(data.width, 400) *
            data.height) /
          data.width
        ),

        size: data.thumbnailSize,

        compressionQuality: 65,

        isDefault: false,
      },
    ],
  });
}

async function syncWallpaperTags(
  wallpaperId: string,
  tags: string[] = []
) {
  if (!tags.length) {
    return;
  }

  for (const value of tags) {
    const name = value.trim();

    if (!name) {
      continue;
    }

    const tag =
      await prisma.tag.upsert({
        where: {
          name,
        },

        update: {},

        create: {
          name,
        },
      });

    await prisma.wallpaperTag.upsert({
      where: {
        wallpaperId_tagId: {
          wallpaperId,
          tagId: tag.id,
        },
      },

      update: {},

      create: {
        wallpaperId,
        tagId: tag.id,
      },
    });
  }
}

async function removeWallpaperTags(
  wallpaperId: string
) {
  await prisma.wallpaperTag.deleteMany({
    where: {
      wallpaperId,
    },
  });
}

async function deleteWallpaperFiles(
  wallpaper: {
    originalPath: string;
    displayPath: string;
    thumbnailPath: string;
  }
) {
  const files = [
    wallpaper.originalPath,
    wallpaper.displayPath,
    wallpaper.thumbnailPath,
  ];

  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(
          path.join(Storage.root, file)
        );
      } catch {
        // Ignore missing files
      }
    })
  );
}

// ======================================================
// SERVICE
// ======================================================

export const wallpaperService = {
  async list({
    limit,
    offset,
    search,
    category,
    premium,
    featured,
    active = true,
  }: ListWallpaperParams) {
    const where: Prisma.WallpaperWhereInput = {
      deletedAt: null,

      active,
    };

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          searchableText: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (category) {
      where.category = {
        OR: [
          {
            slug: category,
          },
          {
            name: {
              equals: category,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    if (premium !== undefined) {
      where.isPremium = premium;
    }

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    const [items, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,

        include: wallpaperInclude,

        orderBy: [
          {
            featuredOrder: "asc",
          },
          {
            createdAt: "desc",
          },
        ],

        skip: offset,

        take: limit,
      }),

      prisma.wallpaper.count({
        where,
      }),
    ]);

    return {
      items: items.map(mapWallpaper),

      total,
    };
  },

  async getById(id: string) {
    const wallpaper =
      await prisma.wallpaper.findUnique({
        where: {
          id,
        },

        include: wallpaperInclude,
      });

    if (!wallpaper) {
      throw ApiError.notFound(
        "Wallpaper not found."
      );
    }

    return mapWallpaper(wallpaper);
  },

  async getBySlug(slug: string) {
    const wallpaper =
      await prisma.wallpaper.findUnique({
        where: {
          slug,
        },

        include: wallpaperInclude,
      });

    if (!wallpaper) {
      throw ApiError.notFound(
        "Wallpaper not found."
      );
    }

    return mapWallpaper(wallpaper);
  },

  async getFeatured(limit = 10) {
    const wallpapers =
      await prisma.wallpaper.findMany({
        where: {
          active: true,

          deletedAt: null,

          status: "READY",

          isFeatured: true,
        },

        include: wallpaperInclude,

        orderBy: [
          {
            featuredOrder: "asc",
          },
          {
            featuredAt: "desc",
          },
        ],

        take: limit,
      });

    return wallpapers.map(
      mapWallpaper
    );
  },

  async getTrending(limit = 20) {
    const wallpapers =
      await prisma.wallpaper.findMany({
        where: {
          active: true,

          deletedAt: null,

          status: "READY",
        },

        include: wallpaperInclude,

        orderBy: [
          {
            downloadCount: "desc",
          },
          {
            likeCount: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        take: limit,
      });

    return wallpapers.map(
      mapWallpaper
    );
  },

  async getPremium(limit = 20) {
    const wallpapers =
      await prisma.wallpaper.findMany({
        where: {
          active: true,

          deletedAt: null,

          status: "READY",

          isPremium: true,
        },

        include: wallpaperInclude,

        orderBy: {
          createdAt: "desc",
        },

        take: limit,
      });

    return wallpapers.map(
      mapWallpaper
    );
  },

  async getByCategory(
    slug: string,
    limit: number,
    offset: number
  ) {
    const category =
      await prisma.category.findUnique({
        where: {
          slug,
        },
      });

    if (!category) {
      throw ApiError.notFound(
        "Category not found."
      );
    }

    const where: Prisma.WallpaperWhereInput = {
      categoryId: category.id,

      active: true,

      deletedAt: null,

      status: "READY",
    };

    const [items, total] =
      await Promise.all([
        prisma.wallpaper.findMany({
          where,

          include:
            wallpaperInclude,

          orderBy: {
            createdAt: "desc",
          },

          skip: offset,

          take: limit,
        }),

        prisma.wallpaper.count({
          where,
        }),
      ]);

    return {
      category,

      items: items.map(
        mapWallpaper
      ),

      total,
    };
  },

  async create(
    file: Express.Multer.File,
    data: CreateWallpaperInput
  ) {
    const category = await getCategory(data.categoryId);

    const slug = await generateUniqueSlug(
      "wallpaper",
      data.title
    );

    createCategoryFolders(category.folderName);

    // ----------------------------------
    // File names
    // ----------------------------------

    const originalExtension = path
      .extname(file.originalname)
      .replace(".", "")
      .toLowerCase();

    const originalFileName =
      randomFileName(originalExtension);

    const processedFileName =
      randomFileName("webp");

    // ----------------------------------
    // Storage paths
    // ----------------------------------

    const paths = getWallpaperPaths(
      category.folderName,
      originalFileName,
      processedFileName
    );

    // Move uploaded file to originals
    moveFile(file.path, paths.original);

    // ----------------------------------
    // Duplicate check
    // ----------------------------------

    const checksum = await generateChecksum(
      paths.original
    );

    const duplicate =
      await prisma.wallpaper.findUnique({
        where: {
          checksum,
        },
      });

    if (duplicate) {
      throw ApiError.conflict(
        "Wallpaper already exists."
      );
    }

    // ----------------------------------
    // Generate display + thumbnail
    // ----------------------------------

    const image = await processWallpaper(
      paths.original,
      paths.display,
      paths.thumbnail
    );

    const searchableText =
      buildSearchableText(
        data.title,
        data.description,
        category.name,
        data.tags
      );

    // ----------------------------------
    // Save wallpaper
    // ----------------------------------

    const wallpaper =
      await prisma.wallpaper.create({
        data: createWallpaperData(
          data,
          slug,
          {
            originalPath: paths.originalDb,

            displayPath: paths.displayDb,

            thumbnailPath: paths.thumbnailDb,

            originalName: file.originalname,

            // Stored filename
            fileName: originalFileName,

            mimeType: file.mimetype,

            extension: originalExtension,

            width: image.width,

            height: image.height,

            aspectRatio: image.aspectRatio,

            originalSize: image.originalSize,

            displaySize: image.displaySize,

            thumbnailSize: image.thumbnailSize,

            checksum,

            blurHash: image.blurHash,

            dominantColor: image.dominantColor,
          },
          searchableText
        ),

        include: wallpaperInclude,
      });

    // ----------------------------------
    // Create variants
    // ----------------------------------

    await createWallpaperVariants(
      wallpaper.id,
      {
        originalPath: paths.originalDb,

        displayPath: paths.displayDb,

        thumbnailPath: paths.thumbnailDb,

        width: wallpaper.width,

        height: wallpaper.height,

        originalSize: wallpaper.originalSize,

        displaySize: wallpaper.displaySize,

        thumbnailSize: wallpaper.thumbnailSize,
      }
    );

    // ----------------------------------
    // Tags
    // ----------------------------------

    await syncWallpaperTags(
      wallpaper.id,
      data.tags
    );

    // ----------------------------------
    // Category Count
    // ----------------------------------

    await incrementCategoryCount(
      category.id
    );

    return mapWallpaper(wallpaper);
  },

  async createMany(
    files: Express.Multer.File[],
    body: Omit<
      CreateWallpaperInput,
      "title"
    > & {
      titles: string[];
      descriptions?: string[];
    }
  ) {
    const wallpapers = [];

    for (
      let i = 0;
      i < files.length;
      i++
    ) {
      wallpapers.push(
        await this.create(
          files[i],
          {
            title:
              body.titles[i] ??
              files[i].originalname,

            description:
              body
                .descriptions?.[
              i
              ] ?? null,

            categoryId:
              body.categoryId,

            quality:
              body.quality,

            isPremium:
              body.isPremium,

            isFeatured:
              body.isFeatured,

            tags:
              body.tags,
          }
        )
      );
    }

    return wallpapers;
  },

  async update(
    id: string,
    data: UpdateWallpaperInput
  ) {
    const existing =
      await prisma.wallpaper.findUnique({
        where: {
          id,
        },

        include: {
          category: true,

          wallpaperTags: {
            include: {
              tag: true,
            },
          },
        },
      });

    if (!existing) {
      throw ApiError.notFound(
        "Wallpaper not found."
      );
    }

    const categoryChanged =
      !!data.categoryId &&
      data.categoryId !== existing.categoryId;

    const category = categoryChanged
      ? await getCategory(data.categoryId!)
      : {
        id: existing.category.id,
        name: existing.category.name,
        slug: existing.category.slug,
        folderName: existing.category.folderName,
      };

    if (categoryChanged) {
      await decrementCategoryCount(
        existing.categoryId
      );

      await incrementCategoryCount(
        category.id
      );
    }

    const title =
      data.title ?? existing.title;

    const description =
      data.description ??
      existing.description;

    const tags =
      data.tags ??
      existing.wallpaperTags.map(
        tag => tag.tag.name
      );

    const searchableText =
      buildSearchableText(
        title,
        description,
        category.name,
        tags
      );

    const active =
      toOptionalBoolean(data.active);

    const isPremium =
      toOptionalBoolean(data.isPremium);

    const isFeatured =
      toOptionalBoolean(data.isFeatured);

    const updateData: Prisma.WallpaperUpdateInput =
    {
      title,

      description,

      searchableText,

      quality: data.quality,

      active,

      isPremium,

      isFeatured,

      featuredAt:
        isFeatured === undefined
          ? undefined
          : isFeatured
            ? new Date()
            : null,
    };

    if (
      data.title &&
      data.title !== existing.title
    ) {
      updateData.slug =
        await generateUniqueSlug(
          "wallpaper",
          data.title,
          existing.id
        );
    }

    if (categoryChanged) {
      updateData.category = {
        connect: {
          id: category.id,
        },
      };
    }

    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: updateData,

      include: wallpaperInclude,
    });

    if (data.tags) {
      await removeWallpaperTags(id);

      await syncWallpaperTags(
        id,
        data.tags
      );
    }

    await this.refreshCacheVersion(id);

    return this.getById(id);
  },

  async delete(id: string) {
    const wallpaper =
      await prisma.wallpaper.findUnique({
        where: {
          id,
        },
      });

    if (!wallpaper) {
      throw ApiError.notFound(
        "Wallpaper not found."
      );
    }

    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        active: false,

        deletedAt: new Date(),
      },
    });

    await deleteWallpaperFiles({
      originalPath:
        wallpaper.originalPath,

      displayPath:
        wallpaper.displayPath,

      thumbnailPath:
        wallpaper.thumbnailPath,
    });

    await prisma.wallpaperVariant.deleteMany({
      where: {
        wallpaperId: id,
      },
    });

    await prisma.wallpaperTag.deleteMany({
      where: {
        wallpaperId: id,
      },
    });

    await decrementCategoryCount(
      wallpaper.categoryId
    );

    return {
      deleted: true,
    };
  },

  async search(
    query: string,
    limit = 20,
    offset = 0
  ) {
    const where: Prisma.WallpaperWhereInput = {
      active: true,

      deletedAt: null,

      status: "READY",

      OR: [
        {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          searchableText: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          wallpaperTags: {
            some: {
              tag: {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,

        include: wallpaperInclude,

        skip: offset,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.wallpaper.count({
        where,
      }),
    ]);

    return {
      items: items.map(mapWallpaper),

      total,
    };
  },

  async related(
    wallpaperId: string,
    limit = 10
  ) {
    const wallpaper =
      await prisma.wallpaper.findUnique({
        where: {
          id: wallpaperId,
        },
      });

    if (!wallpaper) {
      throw ApiError.notFound(
        "Wallpaper not found."
      );
    }

    const wallpapers =
      await prisma.wallpaper.findMany({
        where: {
          id: {
            not: wallpaper.id,
          },

          categoryId:
            wallpaper.categoryId,

          active: true,

          deletedAt: null,

          status: "READY",
        },

        include: wallpaperInclude,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },
      });

    return wallpapers.map(
      mapWallpaper
    );
  },

  async toggleFeatured(id: string) {
    const wallpaper =
      await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        isFeatured:
          !wallpaper.isFeatured,

        featuredAt:
          wallpaper.isFeatured
            ? null
            : new Date(),
      },

      include:
        wallpaperInclude,
    });
  },

  async togglePremium(id: string) {
    const wallpaper =
      await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        isPremium:
          !wallpaper.isPremium,
      },

      include:
        wallpaperInclude,
    });
  },

  async toggleActive(id: string) {
    const wallpaper =
      await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        active:
          !wallpaper.active,
      },

      include:
        wallpaperInclude,
    });
  },

  async incrementViews(
    id: string
  ) {
    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  },

  async incrementDownloads(
    id: string
  ) {
    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  },

  async refreshCacheVersion(
    id: string
  ) {
    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        cacheVersion: {
          increment: 1,
        },
      },
    });
  },
};