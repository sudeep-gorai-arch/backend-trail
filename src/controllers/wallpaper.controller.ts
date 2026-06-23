import { Request, Response } from "express";

import { wallpaperService } from "../services/wallpaper.service";

import { toWallpaperDTO } from "../utils/dto";

import {
  sendSuccess,
  buildPagination,
} from "../utils/ApiResponse";

import { ApiError } from "../utils/ApiError";



export const wallpaperController = {



  // =====================
  // LIST
  // GET /wallpapers
  // =====================

  async list(
    req: Request,
    res: Response
  ) {


    const limit =
      Number(req.query.limit) || 20;


    const offset =
      Number(req.query.offset) || 0;



    const search =
      req.query.search as string | undefined;



    const category =
      req.query.category as string | undefined;




    const {
      items,
      total
    } =
      await wallpaperService.list({

        limit,

        offset,

        search,

        category,

      });




    sendSuccess(

      res,

      items.map(
        w =>
          toWallpaperDTO(
            req,
            w
          )
      ),

      {

        pagination:
          buildPagination(

            total,

            limit,

            offset,

            items.length

          )

      }

    );


  },







  // =====================
  // FEATURED
  // =====================

  async featured(
    req: Request,
    res: Response
  ) {


    const limit =
      Number(req.query.limit)
      ||
      10;



    const items =
      await wallpaperService
        .getFeatured(limit);



    sendSuccess(

      res,

      items.map(
        w =>
          toWallpaperDTO(
            req,
            w
          )
      )

    );


  },








  // =====================
  // TRENDING
  // =====================


  async trending(
    req: Request,
    res: Response
  ) {


    const limit =
      Number(req.query.limit)
      ||
      10;



    const items =
      await wallpaperService
        .getTrending(limit);




    sendSuccess(

      res,

      items.map(
        w =>
          toWallpaperDTO(
            req,
            w
          )
      )

    );


  },









  // =====================
  // DETAIL
  // =====================


  async getById(
    req: Request,
    res: Response
  ) {



    const wallpaper =
      await wallpaperService
        .getById(
          req.params.id
        );



    sendSuccess(

      res,

      toWallpaperDTO(
        req,
        wallpaper
      )

    );


  },










  // =====================
  // CREATE SINGLE
  // POST /wallpapers
  // =====================


  async create(
    req: Request,
    res: Response
  ) {



    const file =
      req.file;




    if (!file) {

      throw ApiError.badRequest(
        "Image required"
      );

    }





    const imagePath =
      `/uploads/${file.filename}`;





    const wallpaper =
      await wallpaperService.create({



        title:
          req.body.title,



        description:
          req.body.description,



        imageUrl:
          imagePath,



        thumbnailUrl:
          imagePath,



        categoryId:
          req.body.categoryId,



        quality:
          req.body.quality,



        resolution:
          req.body.resolution,



        isPremium:
          req.body.isPremium === "true",



        isFeatured:
          req.body.isFeatured === "true",



      });






    sendSuccess(

      res,

      toWallpaperDTO(
        req,
        wallpaper
      ),

      {

        status: 201,

        message:
          "Wallpaper uploaded"

      }


    );



  },












  // =====================
  // BATCH UPLOAD
  // =====================


  async batchUpload(
    req: Request,
    res: Response
  ) {



    const files =
      req.files as Express.Multer.File[];




    if (
      !files ||
      files.length === 0
    ) {

      throw ApiError.badRequest(
        "Images required"
      );

    }







    const titles =
      Array.isArray(req.body.titles)

        ?

        req.body.titles

        :

        [req.body.titles];




    const descriptions =
      Array.isArray(
        req.body.descriptions
      )

        ?

        req.body.descriptions

        :

        [];








    const wallpapers =
      files.map(
        (
          file,
          index
        ) => {



          const path =
            `/uploads/${file.filename}`;





          return {


            title:
              titles[index]
              ||
              file.originalname,



            description:
              descriptions[index]
              ||
              "",




            imageUrl: path,


            thumbnailUrl: path,



            categoryId:
              req.body.categoryId,



            quality:
              req.body.quality,



            resolution:
              req.body.resolution,



            isPremium:
              req.body.isPremium === "true",



            isFeatured:
              req.body.isFeatured === "true",



          };


        });






    const result =
      await wallpaperService
        .createMany(
          wallpapers
        );






    sendSuccess(

      res,

      result,

      {

        status: 201,

        message:
          `${files.length} wallpapers uploaded`

      }

    );



  },









  // =====================
  // UPDATE
  // =====================


  async update(
    req: Request,
    res: Response
  ) {



    const wallpaper =
      await wallpaperService.update(

        req.params.id,

        req.body

      );




    sendSuccess(

      res,


      toWallpaperDTO(
        req,
        wallpaper
      ),

      {

        message:
          "Wallpaper updated"

      }

    );



  },










  // =====================
  // DELETE
  // =====================


  async delete(
    req: Request,
    res: Response
  ) {



    await wallpaperService.delete(
      req.params.id
    );




    sendSuccess(

      res,

      {
        deleted: true
      },

      {
        message:
          "Wallpaper deleted"
      }

    );


  }


};