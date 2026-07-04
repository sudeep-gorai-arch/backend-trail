import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

function optional(name: string, defaultValue: string): string {
    return process.env[name] || defaultValue;
}

function optionalNumber(name: string, defaultValue: number): number {
    const value = process.env[name];

    if (!value) {
        return defaultValue;
    }

    const parsed = Number(value);

    if (isNaN(parsed)) {
        return defaultValue;
    }

    return parsed;
}

export const env = {
    NODE_ENV: optional("NODE_ENV", "development"),

    PORT: optionalNumber("PORT", 5000),

    DATABASE_URL: required("DATABASE_URL"),

    JWT_SECRET: required("JWT_SECRET"),

    JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),

    GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),

    BASE_URL: optional("BASE_URL", "http://localhost:5000"),

    UPLOAD_DIR: optional("UPLOAD_DIR", "storage"),

    CACHE_TTL: optionalNumber("CACHE_TTL", 3600),

    IMAGE_QUALITY: optionalNumber("IMAGE_QUALITY", 82),

    THUMBNAIL_QUALITY: optionalNumber("THUMBNAIL_QUALITY", 70),

    DISPLAY_QUALITY: optionalNumber("DISPLAY_QUALITY", 80),

    MAX_UPLOAD_SIZE: optionalNumber(
        "MAX_UPLOAD_SIZE",
        25 * 1024 * 1024,
    ),
};

export default env;