import { Request } from 'express';
import { absoluteUrl } from './url';


type CategoryLite = {

  id: string;

  name: string;

  slug: string;

  icon: string | null;

};



export type WallpaperRow = {

  id: string;

  title: string;

  description: string | null;

  imageUrl: string | null;     // FIX

  videoUrl: string | null;     // FIX

  thumbnailUrl: string | null;

  quality: string;

  resolution: string;

  isPremium: boolean;

  isFeatured: boolean;

  likes: number;

  downloadCount: number;

  createdAt: Date;

  categoryId: string | null;

  category?: CategoryLite | null;

};




/**
 * Shapes a Prisma wallpaper row into
 * the JSON the frontend consumes.
 */
export const toWallpaperDTO = (
  req: Request,
  w: WallpaperRow
) => ({

  id: w.id,

  title: w.title,

  description: w.description,


  imageUrl:
    w.imageUrl
      ? absoluteUrl(
        req,
        w.imageUrl
      )
      : null,


  videoUrl:
    w.videoUrl
      ? absoluteUrl(
        req,
        w.videoUrl
      )
      : null,


  thumbnailUrl:
    w.thumbnailUrl
      ? absoluteUrl(
        req,
        w.thumbnailUrl
      )
      : null,


  quality:
    w.quality,


  resolution:
    w.resolution,


  isPremium:
    w.isPremium,


  isFeatured:
    w.isFeatured,


  likes:
    w.likes,


  downloadCount:
    w.downloadCount,


  createdAt:
    w.createdAt,


  category:
    w.category
      ? {
        id: w.category.id,
        name: w.category.name,
        slug: w.category.slug,
        icon: w.category.icon,
      }
      : null,

});