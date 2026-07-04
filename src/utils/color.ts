import sharp from "sharp";

export const hexToRgb = (hex: string) => {
    const value = hex.replace("#", "");

    return {
        r: parseInt(value.substring(0, 2), 16),
        g: parseInt(value.substring(2, 4), 16),
        b: parseInt(value.substring(4, 6), 16),
    };
};

export const rgbToHex = (
    r: number,
    g: number,
    b: number,
) =>
    "#" +
    [r, g, b]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");

export const isDark = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);

    const brightness =
        (r * 299 + g * 587 + b * 114) / 1000;

    return brightness < 128;
};

export async function getDominantColor(
    file: string
): Promise<string> {

    const { data } = await sharp(file)
        .resize(1, 1)
        .raw()
        .toBuffer({ resolveWithObject: true });

    return (
        "#" +
        Buffer.from(data)
            .subarray(0, 3)
            .toString("hex")
    );
}