import fs from "fs";
import crypto from "crypto";

/**
 * Generate SHA256 hash from file
 */
export const generateChecksum = async (
    filePath: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");

        const stream = fs.createReadStream(filePath);

        stream.on("data", chunk => {
            hash.update(chunk);
        });

        stream.on("end", () => {
            resolve(hash.digest("hex"));
        });

        stream.on("error", reject);
    });
};

/**
 * Generate checksum from Buffer
 */
export const generateChecksumFromBuffer = (
    buffer: Buffer
): string => {
    return crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");
};

/**
 * Compare two checksums
 */
export const compareChecksum = (
    first: string,
    second: string
): boolean => {
    return first === second;
};

/**
 * Generate MD5
 * Useful for ETags
 */
export const generateMD5 = async (
    filePath: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("md5");

        const stream = fs.createReadStream(filePath);

        stream.on("data", chunk => {
            hash.update(chunk);
        });

        stream.on("end", () => {
            resolve(hash.digest("hex"));
        });

        stream.on("error", reject);
    });
};

/**
 * Generate random token
 */
export const randomToken = (
    length = 32
): string => {
    return crypto
        .randomBytes(length)
        .toString("hex");
};