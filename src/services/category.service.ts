import { Prisma } from "@prisma/client";

import prisma from "../config/prisma";

import { ApiError } from "../utils/ApiError";

import { createCategoryFolders } from "../utils/storage";

import {
  generateSlug,
  generateUniqueSlug,
} from "../utils/slug";

// =====================================================
// TYPES
// =====================================================

export interface CreateCategoryInput {
  name: string;

  slug?: string;

  icon?: string | null;

  description?: string | null;

  folderName?: string;

  coverImage?: string | null;

  thumbnailUrl?: string | null;

  active?: boolean;

  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;

  slug?: string;

  icon?: string | null;

  description?: string | null;

  coverImage?: string | null;

  thumbnailUrl?: string | null;

  active?: boolean;

  sortOrder?: number;
}

// =====================================================
// PRISMA INCLUDE
// =====================================================

const categoryInclude = {
  _count: {
    select: {
      wallpapers: true,
    },
  },
} satisfies Prisma.CategoryInclude;

// =====================================================
// MAPPER
// =====================================================

const mapCategory = (
  category: Prisma.CategoryGetPayload<{
    include: typeof categoryInclude;
  }>,
  premiumCount = 0
) => ({
  id: category.id,

  name: category.name,

  slug: category.slug,

  icon: category.icon,

  description: category.description,

  folderName: category.folderName,

  coverImage: category.coverImage,

  thumbnailUrl: category.thumbnailUrl,

  wallpaperCount: category._count.wallpapers,

  count: category._count.wallpapers,

  premiumCount,

  active: category.active,

  sortOrder: category.sortOrder,

  createdAt: category.createdAt,

  updatedAt: category.updatedAt,
});

// =====================================================
// HELPERS
// =====================================================

async function ensureUnique(
  name: string,
  slug: string,
  ignoreId?: string
) {
  const existing =
    await prisma.category.findFirst({
      where: {
        OR: [
          {
            name,
          },
          {
            slug,
          },
        ],

        ...(ignoreId && {
          NOT: {
            id: ignoreId,
          },
        }),
      },
    });

  if (!existing) return;

  if (existing.name === name) {
    throw ApiError.conflict(
      "Category name already exists."
    );
  }

  throw ApiError.conflict(
    "Category slug already exists."
  );
}

// =====================================================
// SERVICE
// =====================================================

export const categoryService = {

  async list(filters?: {
    active?: boolean;
    premiumOnly?: boolean;
  }) {
    const categories = await prisma.category.findMany({
      where: {
        ...(filters?.active !== undefined && {
          active: filters.active,
        }),
      },

      include: categoryInclude,

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    const premiumCounts = await prisma.wallpaper.groupBy({
      by: ["categoryId"],

      where: {
        isPremium: true,
        active: true,
      },

      _count: {
        _all: true,
      },
    });

    const premiumMap = new Map<string, number>(
      premiumCounts.map(item => [
        item.categoryId,
        item._count._all,
      ])
    );

    return categories.map(category =>
      mapCategory(
        category,
        premiumMap.get(category.id) ?? 0
      )
    );
  },

  async getBySlug(slug: string) {
    const category =
      await prisma.category.findUnique({
        where: {
          slug,
        },

        include: categoryInclude,
      });

    if (!category) {
      throw ApiError.notFound(
        "Category not found."
      );
    }

    return mapCategory(category);
  },

  async create(data: CreateCategoryInput) {
    const name = data.name.trim();

    const slug = data.slug
      ? generateSlug(data.slug)
      : await generateUniqueSlug(
        "category",
        name
      );

    if (!slug) {
      throw ApiError.badRequest(
        "Invalid category slug."
      );
    }

    await ensureUnique(name, slug);

    const folderName =
      data.folderName ??
      slug.replace(/-/g, "_");

    createCategoryFolders(folderName);

    const category =
      await prisma.category.create({
        data: {
          name,

          slug,

          icon: data.icon,

          description:
            data.description,

          folderName,

          coverImage:
            data.coverImage,

          thumbnailUrl:
            data.thumbnailUrl,

          active:
            data.active ?? true,

          sortOrder:
            data.sortOrder ?? 0,
        },

        include: categoryInclude,
      });

    return mapCategory(category);
  },

  async update(
    slug: string,
    data: UpdateCategoryInput
  ) {
    const existing =
      await prisma.category.findUnique({
        where: {
          slug,
        },
      });

    if (!existing) {
      throw ApiError.notFound(
        "Category not found."
      );
    }

    const updateData: Prisma.CategoryUpdateInput =
      {};

    if (data.name !== undefined) {
      updateData.name =
        data.name.trim();
    }

    if (data.slug !== undefined) {
      const nextSlug =
        await generateUniqueSlug(
          "category",
          data.slug,
          existing.id
        );

      await ensureUnique(
        data.name ??
        existing.name,
        nextSlug,
        existing.id
      );

      updateData.slug =
        nextSlug;
    }

    if (data.icon !== undefined) {
      updateData.icon =
        data.icon;
    }

    if (
      data.description !==
      undefined
    ) {
      updateData.description =
        data.description;
    }

    if (
      data.coverImage !==
      undefined
    ) {
      updateData.coverImage =
        data.coverImage;
    }

    if (
      data.thumbnailUrl !==
      undefined
    ) {
      updateData.thumbnailUrl =
        data.thumbnailUrl;
    }

    if (
      data.active !==
      undefined
    ) {
      updateData.active =
        data.active;
    }

    if (
      data.sortOrder !==
      undefined
    ) {
      updateData.sortOrder =
        data.sortOrder;
    }

    const category =
      await prisma.category.update({
        where: {
          id: existing.id,
        },

        data: updateData,

        include:
          categoryInclude,
      });

    return mapCategory(category);
  },

  async delete(slug: string) {
    const category =
      await prisma.category.findUnique({
        where: {
          slug,
        },

        include: {
          _count: {
            select: {
              wallpapers: true,
            },
          },
        },
      });

    if (!category) {
      throw ApiError.notFound(
        "Category not found."
      );
    }

    if (
      category._count.wallpapers >
      0
    ) {
      throw ApiError.badRequest(
        "Cannot delete a category that contains wallpapers."
      );
    }

    await prisma.category.delete({
      where: {
        id: category.id,
      },
    });

    return {
      deleted: true,
      category:
        mapCategory(category),
    };
  },

  async toggleActive(
    slug: string
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

    const updated =
      await prisma.category.update({
        where: {
          id: category.id,
        },

        data: {
          active:
            !category.active,
        },

        include:
          categoryInclude,
      });

    return mapCategory(updated);
  },

  async reorder(
    slug: string,
    sortOrder: number
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

    const updated =
      await prisma.category.update({
        where: {
          id: category.id,
        },

        data: {
          sortOrder,
        },

        include:
          categoryInclude,
      });

    return mapCategory(updated);
  },

}