import { Prisma } from '@prisma/client';

import prisma from '../config/prisma';

import { ApiError } from '../utils/ApiError';



const withCategory = {

  category: {

    select: {

      id: true,

      name: true,

      slug: true,

      icon: true,

    },

  },

} satisfies Prisma.WallpaperInclude;





export interface ListParams {

  limit: number;

  offset: number;

  search?: string;

  category?: string;

}





type CreateWallpaperInput = {


  title: string;


  description?: string;


  imageUrl: string;


  thumbnailUrl?: string;


  categoryId: string;


  quality: string;


  resolution: string;


  isPremium: boolean;


  isFeatured: boolean;


};









export const wallpaperService = {




  async list({

    limit,

    offset,

    search,

    category,

  }: ListParams) {




    const where: Prisma.WallpaperWhereInput = {};




    if (search) {


      where.title = {

        contains: search,

        mode: "insensitive",

      };


    }





    if (category) {


      where.category = {


        OR: [

          {
            slug: category
          },


          {
            name: category
          },


        ],


      };


    }







    const [items, total] =

      await Promise.all([



        prisma.wallpaper.findMany({


          where,


          include: withCategory,


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

      items,

      total,

    };


  },










  async getById(id: string) {



    const wallpaper =

      await prisma.wallpaper.findUnique({



        where: {

          id,

        },



        include: withCategory,



      });






    if (!wallpaper) {


      throw ApiError.notFound(

        `Wallpaper ${id} not found`

      );


    }





    return wallpaper;



  },












  async getFeatured(limit: number) {



    return prisma.wallpaper.findMany({



      where: {

        isFeatured: true,

      },



      include: withCategory,



      orderBy: [


        {

          likes: "desc",

        },



        {

          createdAt: "desc",

        },


      ],



      take: limit,



    });



  },









  async getTrending(limit: number) {




    return prisma.wallpaper.findMany({



      include: withCategory,



      orderBy: [


        {

          downloadCount: "desc",

        },


        {

          likes: "desc",

        },


      ],



      take: limit,



    });



  },












  // CREATE SINGLE


  async create(

    data: CreateWallpaperInput

  ) {




    return prisma.wallpaper.create({



      data: {


        title: data.title,


        description: data.description,


        imageUrl: data.imageUrl,


        thumbnailUrl: data.thumbnailUrl,


        categoryId: data.categoryId,


        quality: data.quality,


        resolution: data.resolution,


        isPremium: data.isPremium,


        isFeatured: data.isFeatured,


      },



      include: withCategory,



    });



  },












  // BATCH UPLOAD


  async createMany(

    wallpapers: CreateWallpaperInput[]

  ) {




    return prisma.wallpaper.createMany({



      data: wallpapers.map(w => ({



        title: w.title,


        description: w.description,


        imageUrl: w.imageUrl,


        thumbnailUrl: w.thumbnailUrl,


        categoryId: w.categoryId,


        quality: w.quality,


        resolution: w.resolution,


        isPremium: w.isPremium,


        isFeatured: w.isFeatured,



      })),



    });




  },













  async update(

    id: string,


    data: Prisma.WallpaperUpdateInput


  ) {




    await this.getById(id);





    return prisma.wallpaper.update({



      where: {

        id,

      },



      data,



      include: withCategory,



    });




  },













  async delete(id: string) {




    await this.getById(id);





    await prisma.wallpaper.delete({


      where: {

        id,

      },


    });





    return {

      message: "Wallpaper deleted",

    };



  },



};