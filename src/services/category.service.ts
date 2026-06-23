import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const withCategory = {
  category: { select: { id: true, name: true, slug: true, icon: true } },
};

export const categoryService = {


  async list() {


    const categories =
      await prisma.category.findMany({

        orderBy: {
          name: "asc"
        },


        include: {

          _count: {

            select: {
              wallpapers: true
            }

          }

        }


      });



    return categories.map((c) => ({


      id: c.id,


      name: c.name,


      slug: c.slug,


      icon: c.icon,


      createdAt: c.createdAt,


      count: c._count.wallpapers


    }));


  },





  async getBySlug(slug: string) {


    const category =
      await prisma.category.findUnique({

        where: {
          slug
        }

      });



    if (!category) {

      throw ApiError.notFound(
        `Category '${slug}' not found`
      );

    }



    return category;


  },





  async getWallpapers(
    slug: string,
    limit: number,
    offset: number
  ) {



    const category =
      await this.getBySlug(slug);



    const where = {

      categoryId:
        category.id

    };




    const [items, total] =
      await Promise.all([


        prisma.wallpaper.findMany({

          where,

          include: withCategory,

          orderBy: {
            createdAt: "desc"
          },

          skip: offset,

          take: limit


        }),




        prisma.wallpaper.count({
          where
        })


      ]);




    return {

      category,

      items,

      total

    };


  }


};
