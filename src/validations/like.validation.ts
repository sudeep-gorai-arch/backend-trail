import { z } from "zod";

export const likeParams = z.object({
    wallpaperId: z.string().uuid(),
});