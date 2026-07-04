import sharp from "sharp";
import fs from "fs";
import { encode } from "blurhash";
import { getDominantColor } from "./color";

export interface ImageProcessResult {
    width: number;
    height: number;
    aspectRatio: number;
    resolution: string;
    format: string;
    originalSize: number;
    displaySize: number;
    thumbnailSize: number;

    dominantColor?: string;
    blurHash?: string;
}

const getBlurHash = async (file: string) => {
    const { data, info } = await sharp(file)
        .raw()
        .ensureAlpha()
        .resize(32, 32, {
            fit: "inside",
        })
        .toBuffer({ resolveWithObject: true });

    return encode(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
        4,
        4
    );
};

export const processWallpaper = async (
    originalPath: string,
    displayPath: string,
    thumbnailPath: string
): Promise<ImageProcessResult> => {

    const metadata = await sharp(originalPath).metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const aspectRatio = Number((width / height).toFixed(4));

    // Display Image
    await sharp(originalPath)
        .resize({
            width: 1440,
            withoutEnlargement: true,
        })
        .webp({
            quality: 82,
        })
        .toFile(displayPath);

    // Thumbnail
    await sharp(originalPath)
        .resize({
            width: 400,
            withoutEnlargement: true,
        })
        .webp({
            quality: 65,
        })
        .toFile(thumbnailPath);

    const originalStats = fs.statSync(originalPath);
    const displayStats = fs.statSync(displayPath);
    const thumbStats = fs.statSync(thumbnailPath);

    const dominantColor =
        await getDominantColor(originalPath);

    const blurHash =
        await getBlurHash(displayPath);

    return {
        width,
        height,
        aspectRatio,

        resolution: `${width}x${height}`,

        // Preserve the uploaded format
        format: metadata.format ?? "unknown",

        originalSize: originalStats.size,
        displaySize: displayStats.size,
        thumbnailSize: thumbStats.size,

        dominantColor,
        blurHash,
    };
};