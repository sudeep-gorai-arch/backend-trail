import sharp from "sharp";

export interface ImageMetadata {
    width: number;
    height: number;
    aspectRatio: number;
    resolution: string;
    orientation: "portrait" | "landscape" | "square";
}

export const getMetadata = async (
    file: string,
): Promise<ImageMetadata> => {
    const meta = await sharp(file).metadata();

    const width = meta.width || 0;
    const height = meta.height || 0;

    let orientation: ImageMetadata["orientation"] = "portrait";

    if (width > height) orientation = "landscape";

    if (width === height) orientation = "square";

    return {
        width,
        height,
        aspectRatio: Number((width / height).toFixed(2)),
        resolution: `${width}x${height}`,
        orientation,
    };
};