import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const getWallpaper = async (wallpaperId: string) => {
    const wallpaper = await prisma.wallpaper.findUnique({
        where: {
            id: wallpaperId,
        },
    });

    if (!wallpaper) {
        throw ApiError.notFound("Wallpaper not found.");
    }

    return wallpaper;
};

export const likeService = {
    async like(
        userId: string,
        wallpaperId: string
    ) {
        await getWallpaper(wallpaperId);

        const existing =
            await prisma.wallpaperLike.findUnique({
                where: {
                    userId_wallpaperId: {
                        userId,
                        wallpaperId,
                    },
                },
            });

        if (existing) {
            return {
                liked: true,
            };
        }

        await prisma.$transaction([
            prisma.wallpaperLike.create({
                data: {
                    userId,
                    wallpaperId,
                },
            }),

            prisma.wallpaper.update({
                where: {
                    id: wallpaperId,
                },
                data: {
                    likeCount: {
                        increment: 1,
                    },
                },
            }),
        ]);

        return {
            liked: true,
        };
    },

    async unlike(
        userId: string,
        wallpaperId: string
    ) {
        const existing =
            await prisma.wallpaperLike.findUnique({
                where: {
                    userId_wallpaperId: {
                        userId,
                        wallpaperId,
                    },
                },
            });

        if (!existing) {
            return {
                liked: false,
            };
        }

        await prisma.$transaction([
            prisma.wallpaperLike.delete({
                where: {
                    userId_wallpaperId: {
                        userId,
                        wallpaperId,
                    },
                },
            }),

            prisma.wallpaper.update({
                where: {
                    id: wallpaperId,
                },
                data: {
                    likeCount: {
                        decrement: 1,
                    },
                },
            }),
        ]);

        return {
            liked: false,
        };
    },

    async status(
        userId: string,
        wallpaperId: string
    ) {
        const like =
            await prisma.wallpaperLike.findUnique({
                where: {
                    userId_wallpaperId: {
                        userId,
                        wallpaperId,
                    },
                },
            });

        return {
            liked: !!like,
        };
    },
};