import { Request } from "express";
import { absoluteUrl } from "../url";

export const toUserDTO = (req: Request, user: any) => ({
    id: user.id,

    email: user.email,

    username: user.username,

    avatarUrl: user.avatarUrl
        ? absoluteUrl(req, user.avatarUrl)
        : null,

    bio: user.bio,

    isPremium: user.isPremium,

    premiumUntil: user.premiumUntil,

    favoriteCount: user.favoriteCount,

    createdAt: user.createdAt,

    updatedAt: user.updatedAt
});