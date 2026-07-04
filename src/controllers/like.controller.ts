import { Request, Response } from "express";

import { likeService } from "../services/like.service";

import { response } from "../utils/ApiResponse";

export const likeController = {
    async like(
        req: Request,
        res: Response
    ) {
        const result =
            await likeService.like(
                req.user!.id,
                req.params.wallpaperId
            );

        response.success(res, result, {
            message: "Wallpaper liked.",
        });
    },

    async unlike(
        req: Request,
        res: Response
    ) {
        const result =
            await likeService.unlike(
                req.user!.id,
                req.params.wallpaperId
            );

        response.success(res, result, {
            message: "Wallpaper unliked.",
        });
    },

    async status(
        req: Request,
        res: Response
    ) {
        const result =
            await likeService.status(
                req.user!.id,
                req.params.wallpaperId
            );

        response.success(res, result);
    },
};