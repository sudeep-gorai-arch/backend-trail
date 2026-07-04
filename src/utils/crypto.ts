import crypto from "crypto";

export const randomString = (
    length = 32,
) =>
    crypto
        .randomBytes(length)
        .toString("hex")
        .substring(0, length);

export const randomToken = () =>
    crypto.randomBytes(64).toString("hex");

export const sha256 = (value: string) =>
    crypto
        .createHash("sha256")
        .update(value)
        .digest("hex");

export const generateUUID = () =>
    crypto.randomUUID();