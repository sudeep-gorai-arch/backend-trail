import { VariantType } from "@prisma/client";

export const getVariant = (
    variants: {
        type: VariantType;
        url: string;
    }[],
    type: VariantType,
) => variants.find((v) => v.type === type);

export const getThumbnail = (variants: any[]) =>
    getVariant(variants, VariantType.THUMBNAIL);

export const getDisplay = (variants: any[]) =>
    getVariant(variants, VariantType.DISPLAY);

export const getOriginal = (variants: any[]) =>
    getVariant(variants, VariantType.ORIGINAL);