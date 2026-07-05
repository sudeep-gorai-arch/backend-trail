import { Prisma, WallpaperQuality } from "@prisma/client";

import prisma from "../config/prisma";

import { ApiError } from "../utils/ApiError";

import path from "path";
import sharp from "sharp";
import { createHash } from "crypto";

import { generateUniqueSlug } from "../utils/slug";

import { deleteFromR2, uploadBufferToR2 } from "./r2.service";

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

  sort?: "latest" | "popular" | "downloads" | "likes" | "featured";
}

export interface TopWeekWallpaperParams {
  limit?: number;

  category?: string;
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

async function getCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
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
    throw ApiError.notFound("Category not found.");
  }

  return category;
}

function buildSearchableText(
  title: string,
  description?: string | null,
  category?: string,
  tags: string[] = []
) {
  return [title, description, category, ...tags].filter(Boolean).join(" ");
}

async function incrementCategoryCount(categoryId: string) {
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

async function decrementCategoryCount(categoryId: string) {
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

function toBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

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

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
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
  const isPremium = toBoolean(data.isPremium, false);

  const isFeatured = toBoolean(data.isFeatured, false);

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

    quality: data.quality ?? WallpaperQuality.UHD_4K,

    format: "webp",

    checksum: image.checksum,

    blurHash: image.blurHash,

    dominantColor: image.dominantColor,

    searchableText,

    isPremium,

    isFeatured,

    featuredAt: isFeatured ? new Date() : null,

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

        height: Math.round((Math.min(data.width, 1440) * data.height) / data.width),

        size: data.displaySize,

        compressionQuality: 82,

        isDefault: true,
      },

      {
        wallpaperId,

        type: "THUMBNAIL",

        url: data.thumbnailPath,

        width: Math.min(data.width, 400),

        height: Math.round((Math.min(data.width, 400) * data.height) / data.width),

        size: data.thumbnailSize,

        compressionQuality: 65,

        isDefault: false,
      },
    ],
  });
}

async function syncWallpaperTags(wallpaperId: string, tags: string[] = []) {
  if (!tags.length) {
    return;
  }

  for (const value of tags) {
    const name = value.trim();

    if (!name) {
      continue;
    }

    const tag = await prisma.tag.upsert({
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

async function removeWallpaperTags(wallpaperId: string) {
  await prisma.wallpaperTag.deleteMany({
    where: {
      wallpaperId,
    },
  });
}

async function deleteWallpaperFiles(wallpaper: {
  originalPath: string;
  displayPath: string;
  thumbnailPath: string;
}) {
  const files = [
    wallpaper.originalPath,
    wallpaper.displayPath,
    wallpaper.thumbnailPath,
  ];

  await Promise.all(
    files.map(async (file) => {
      try {
        await deleteFromR2(file);
      } catch {
        // Ignore delete failures so DB delete does not fail
      }
    })
  );
}

function buildChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function safeFolderName(value?: string | null) {
  return (
    String(value || "uncategorized")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "uncategorized"
  );
}

function getExtension(filename: string, mimetype?: string) {
  const ext = path.extname(filename || "").replace(".", "").toLowerCase();

  if (ext) return ext;

  if (mimetype?.includes("png")) return "png";
  if (mimetype?.includes("webp")) return "webp";
  if (mimetype?.includes("avif")) return "avif";

  return "jpg";
}

async function processWallpaperForR2(
  file: Express.Multer.File,
  categoryFolder: string,
  slug: string
) {
  if (!file.buffer || file.buffer.length === 0) {
    throw ApiError.badRequest("Uploaded wallpaper file buffer is empty.");
  }

  const metadata = await sharp(file.buffer).rotate().metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) {
    throw ApiError.badRequest("Invalid wallpaper image.");
  }

  const displayBuffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width: 1440,
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
      effort: 6,
    })
    .toBuffer();

  const thumbnailBuffer = await sharp(file.buffer)
    .rotate()
    .resize(400, 400, {
      fit: "cover",
      position: "centre",
    })
    .webp({
      quality: 65,
      effort: 6,
    })
    .toBuffer();

  const originalUpload = await uploadBufferToR2({
    buffer: file.buffer,
    originalName:
      file.originalname || `${slug}.${getExtension(file.originalname, file.mimetype)}`,
    contentType: file.mimetype || "application/octet-stream",
    folder: `originals/${categoryFolder}`,
  });

  const displayUpload = await uploadBufferToR2({
    buffer: displayBuffer,
    originalName: `${slug}-display.webp`,
    contentType: "image/webp",
    folder: `display/${categoryFolder}`,
  });

  const thumbnailUpload = await uploadBufferToR2({
    buffer: thumbnailBuffer,
    originalName: `${slug}-thumbnail.webp`,
    contentType: "image/webp",
    folder: `thumbnails/${categoryFolder}`,
  });

  return {
    originalPath: originalUpload.url,
    displayPath: displayUpload.url,
    thumbnailPath: thumbnailUpload.url,
    originalKey: originalUpload.key,
    displayKey: displayUpload.key,
    thumbnailKey: thumbnailUpload.key,
    width,
    height,
    aspectRatio: width / height,
    originalSize: file.size || file.buffer.length,
    displaySize: displayBuffer.length,
    thumbnailSize: thumbnailBuffer.length,
    blurHash: null,
    dominantColor: null,
  };
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
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        id,
      },

      include: wallpaperInclude,
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    return mapWallpaper(wallpaper);
  },

  async getBySlug(slug: string) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        slug,
      },

      include: wallpaperInclude,
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    return mapWallpaper(wallpaper);
  },

  async getFeatured(limit = 10) {
    const wallpapers = await prisma.wallpaper.findMany({
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

    return wallpapers.map(mapWallpaper);
  },

  async getTrending(limit = 20) {
    const wallpapers = await prisma.wallpaper.findMany({
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

    return wallpapers.map(mapWallpaper);
  },

  async getTopWeek({
    limit = 10,
    category,
  }: TopWeekWallpaperParams = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const selectedCategory = String(category || "").trim();

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const wallpaperWhere: Prisma.WallpaperWhereInput = {
      active: true,

      deletedAt: null,

      status: "READY",
    };

    if (selectedCategory && selectedCategory.toLowerCase() !== "all") {
      wallpaperWhere.category = {
        OR: [
          {
            slug: selectedCategory,
          },
          {
            name: {
              equals: selectedCategory,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    const downloadGroups = await prisma.download.groupBy({
      by: ["wallpaperId"],

      where: {
        createdAt: {
          gte: since,
        },

        wallpaper: {
          is: wallpaperWhere,
        },
      },

      _count: {
        wallpaperId: true,
      },
    });

    const topDownloadGroups = downloadGroups
      .sort((a, b) => b._count.wallpaperId - a._count.wallpaperId)
      .slice(0, safeLimit);

    if (!topDownloadGroups.length) {
      return [];
    }

    const weeklyDownloadCountByWallpaperId = new Map(
      topDownloadGroups.map((item) => [
        item.wallpaperId,
        item._count.wallpaperId,
      ])
    );

    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        id: {
          in: topDownloadGroups.map((item) => item.wallpaperId),
        },
      },

      include: wallpaperInclude,
    });

    const wallpaperById = new Map(
      wallpapers.map((wallpaper) => [wallpaper.id, wallpaper])
    );

    const topWallpapers: Array<
      ReturnType<typeof mapWallpaper> & {
        downloadsThisWeek: number;
        weeklyDownloads: number;
      }
    > = [];

    for (const item of topDownloadGroups) {
      const wallpaper = wallpaperById.get(item.wallpaperId);

      if (!wallpaper) {
        continue;
      }

      const weeklyDownloads =
        weeklyDownloadCountByWallpaperId.get(item.wallpaperId) || 0;

      topWallpapers.push({
        ...mapWallpaper(wallpaper),

        downloadsThisWeek: weeklyDownloads,

        weeklyDownloads,
      });
    }

    return topWallpapers;
  },

  async getPremium(limit = 20) {
    const wallpapers = await prisma.wallpaper.findMany({
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

    return wallpapers.map(mapWallpaper);
  },

  async getByCategory(slug: string, limit: number, offset: number) {
    const category = await prisma.category.findUnique({
      where: {
        slug,
      },
    });

    if (!category) {
      throw ApiError.notFound("Category not found.");
    }

    const where: Prisma.WallpaperWhereInput = {
      categoryId: category.id,

      active: true,

      deletedAt: null,

      status: "READY",
    };

    const [items, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,

        include: wallpaperInclude,

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

      items: items.map(mapWallpaper),

      total,
    };
  },

  async create(file: Express.Multer.File, data: CreateWallpaperInput) {
    const category = await getCategory(data.categoryId);

    const slug = await generateUniqueSlug("wallpaper", data.title);

    if (!file.buffer || file.buffer.length === 0) {
      throw ApiError.badRequest("Uploaded wallpaper file buffer is empty.");
    }

    const checksum = buildChecksum(file.buffer);

    const duplicate = await prisma.wallpaper.findUnique({
      where: {
        checksum,
      },
    });

    if (duplicate) {
      throw ApiError.conflict("Wallpaper already exists.");
    }

    const categoryFolder = safeFolderName(
      category.folderName || category.slug || category.name
    );

    const originalExtension = getExtension(file.originalname, file.mimetype);

    const image = await processWallpaperForR2(file, categoryFolder, slug);

    const searchableText = buildSearchableText(
      data.title,
      data.description,
      category.name,
      data.tags
    );

    const originalFileName = image.originalKey.split("/").pop() || file.originalname;

    const wallpaper = await prisma.wallpaper.create({
      data: createWallpaperData(
        data,
        slug,
        {
          originalPath: image.originalPath,

          displayPath: image.displayPath,

          thumbnailPath: image.thumbnailPath,

          originalName: file.originalname,

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

    await createWallpaperVariants(wallpaper.id, {
      originalPath: image.originalPath,

      displayPath: image.displayPath,

      thumbnailPath: image.thumbnailPath,

      width: wallpaper.width,

      height: wallpaper.height,

      originalSize: wallpaper.originalSize,

      displaySize: wallpaper.displaySize,

      thumbnailSize: wallpaper.thumbnailSize,
    });

    await syncWallpaperTags(wallpaper.id, data.tags);

    await incrementCategoryCount(category.id);

    return mapWallpaper(wallpaper);
  },

  async createMany(
    files: Express.Multer.File[],
    body: Omit<CreateWallpaperInput, "title"> & {
      titles: string[];
      descriptions?: string[];
    }
  ) {
    const wallpapers = [];

    for (let i = 0; i < files.length; i++) {
      wallpapers.push(
        await this.create(files[i], {
          title: body.titles[i] ?? files[i].originalname,

          description: body.descriptions?.[i] ?? null,

          categoryId: body.categoryId,

          quality: body.quality,

          isPremium: body.isPremium,

          isFeatured: body.isFeatured,

          tags: body.tags,
        })
      );
    }

    return wallpapers;
  },

  async update(id: string, data: UpdateWallpaperInput) {
    const existing = await prisma.wallpaper.findUnique({
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
      throw ApiError.notFound("Wallpaper not found.");
    }

    const categoryChanged = !!data.categoryId && data.categoryId !== existing.categoryId;

    const category = categoryChanged
      ? await getCategory(data.categoryId!)
      : {
          id: existing.category.id,
          name: existing.category.name,
          slug: existing.category.slug,
          folderName: existing.category.folderName,
        };

    if (categoryChanged) {
      await decrementCategoryCount(existing.categoryId);

      await incrementCategoryCount(category.id);
    }

    const title = data.title ?? existing.title;

    const description = data.description ?? existing.description;

    const tags =
      data.tags ??
      existing.wallpaperTags.map((tag) => tag.tag.name);

    const searchableText = buildSearchableText(
      title,
      description,
      category.name,
      tags
    );

    const active = toOptionalBoolean(data.active);

    const isPremium = toOptionalBoolean(data.isPremium);

    const isFeatured = toOptionalBoolean(data.isFeatured);

    const updateData: Prisma.WallpaperUpdateInput = {
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

    if (data.title && data.title !== existing.title) {
      updateData.slug = await generateUniqueSlug("wallpaper", data.title, existing.id);
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

      await syncWallpaperTags(id, data.tags);
    }

    await this.refreshCacheVersion(id);

    return this.getById(id);
  },

  async delete(id: string) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        id,
      },
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
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
      originalPath: wallpaper.originalPath,

      displayPath: wallpaper.displayPath,

      thumbnailPath: wallpaper.thumbnailPath,
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

    await decrementCategoryCount(wallpaper.categoryId);

    return {
      deleted: true,
    };
  },

  async search(query: string, limit = 20, offset = 0) {
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

  async related(wallpaperId: string, limit = 10) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        id: wallpaperId,
      },
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        id: {
          not: wallpaper.id,
        },

        categoryId: wallpaper.categoryId,

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

    return wallpapers.map(mapWallpaper);
  },

  async toggleFeatured(id: string) {
    const wallpaper = await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        isFeatured: !wallpaper.isFeatured,

        featuredAt: wallpaper.isFeatured ? null : new Date(),
      },

      include: wallpaperInclude,
    });
  },

  async togglePremium(id: string) {
    const wallpaper = await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        isPremium: !wallpaper.isPremium,
      },

      include: wallpaperInclude,
    });
  },

  async toggleActive(id: string) {
    const wallpaper = await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        active: !wallpaper.active,
      },

      include: wallpaperInclude,
    });
  },

  async incrementViews(id: string) {
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

  async incrementDownloads(id: string) {
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

  async refreshCacheVersion(id: string) {
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