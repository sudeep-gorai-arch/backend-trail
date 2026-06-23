import { prisma } from '../config/prisma';
import { ApiError } from '../utils/ApiError';


const FREE_DAILY_LIMIT = 5;


const withCategory = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
  },
};


export const downloadService = {


  /**
   * Download wallpaper
   *
   * Rules:
   *
   * Free user:
   * - cannot download premium wallpapers
   * - max 5 downloads/day
   *
   * Premium:
   * - all wallpapers
   * - unlimited downloads
   */

  async record(
    userId: string,
    wallpaperId: string
  ) {


    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });


    if (!user) {

      throw ApiError.notFound(
        'User not found'
      );

    }



    const wallpaper =
      await prisma.wallpaper.findUnique({
        where: {
          id: wallpaperId,
        },
      });



    if (!wallpaper) {

      throw ApiError.notFound(
        `Wallpaper ${wallpaperId} not found`
      );

    }



    /*
    -------------------------------
    CHECK PREMIUM STATUS
    -------------------------------
    */


    const premiumActive =

      user.isPremium &&

      user.premiumUntil &&

      user.premiumUntil > new Date();



    /*
    -------------------------------
    BLOCK PREMIUM WALLPAPER
    -------------------------------
    */


    if (
      wallpaper.isPremium &&
      !premiumActive
    ) {


      throw ApiError.forbidden(
        'Premium subscription required'
      );


    }




    /*
    -------------------------------
    RESET DAILY LIMIT
    -------------------------------
    */


    let dailyCount =
      user.dailyDownloadCount;



    const today =
      new Date()
        .toDateString();



    const lastReset =
      user.lastDownloadReset
        ?.toDateString();




    if (
      today !== lastReset
    ) {


      dailyCount = 0;


      await prisma.user.update({

        where: {
          id: userId
        },

        data: {

          dailyDownloadCount: 0,

          lastDownloadReset:
            new Date()

        }

      });


    }





    /*
    -------------------------------
    FREE DOWNLOAD LIMIT
    -------------------------------
    */


    if (!premiumActive) {


      if (
        dailyCount >= FREE_DAILY_LIMIT
      ) {


        throw ApiError.forbidden(
          'Daily free download limit reached'
        );


      }


    }




    /*
    -------------------------------
    TRANSACTION
    -------------------------------
    */


    const result =
      await prisma.$transaction(
        async (tx) => {


          const download =
            await tx.download.create({

              data: {

                userId,

                wallpaperId,

                quality:
                  wallpaper.quality,

              },


            });




          await tx.wallpaper.update({

            where: {
              id: wallpaperId
            },

            data: {

              downloadCount: {
                increment: 1
              }

            }

          });





          if (!premiumActive) {


            await tx.user.update({

              where: {
                id: userId
              },

              data: {

                dailyDownloadCount: {
                  increment: 1
                }

              }

            });


          }





          return download;


        }
      );



    /*
    return URL to app
    */


    return {

      ...result,


      downloadUrl:
        wallpaper.imageUrl,


      quality:
        wallpaper.quality,


      isPremium:
        wallpaper.isPremium

    };



  },



  async recordPublic(
    wallpaperId: string
  ) {


    const wallpaper =
      await prisma.wallpaper.findUnique({

        where: {
          id: wallpaperId,
        },

      });



    if (!wallpaper) {

      throw ApiError.notFound(
        `Wallpaper ${wallpaperId} not found`
      );

    }



    /*
    -------------------------------
    BLOCK PREMIUM DOWNLOAD
    -------------------------------
    */


    if (wallpaper.isPremium) {

      throw ApiError.forbidden(
        'Premium wallpaper requires login'
      );

    }





    /*
    -------------------------------
    CREATE DOWNLOAD RECORD
    WITHOUT USER
    -------------------------------
    */


    const result =
      await prisma.$transaction(
        async (tx) => {


          const download =
            await tx.download.create({

              data: {

                wallpaperId,

                quality:
                  wallpaper.quality,

              },


            });





          await tx.wallpaper.update({

            where: {
              id: wallpaperId
            },


            data: {

              downloadCount: {
                increment: 1
              }

            },


          });




          return download;


        }
      );




    return {

      ...result,


      downloadUrl:
        wallpaper.imageUrl,


      quality:
        wallpaper.quality,


      isPremium:
        wallpaper.isPremium

    };


  },



  /**
   * User download history
   */


  async list(
    userId: string,
    limit: number,
    offset: number
  ) {


    const [rows, total] =
      await Promise.all([


        prisma.download.findMany({

          where: {
            userId,
          },


          include: {

            wallpaper: {

              include:
                withCategory,

            }

          },


          orderBy: {

            createdAt: 'desc'

          },


          skip: offset,

          take: limit,


        }),




        prisma.download.count({

          where: {
            userId

          }

        })



      ]);





    return {


      items:

        rows.map(
          (r) => ({

            ...r.wallpaper,


            downloadedAt:
              r.createdAt,


          })
        ),



      total,


    };


  },


};