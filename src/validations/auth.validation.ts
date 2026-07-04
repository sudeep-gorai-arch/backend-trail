import { z } from "zod";

// ======================================
// LOGIN
// ======================================

export const loginBody = z.object({
    email: z
        .string()
        .trim()
        .email("Invalid email"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),
});

// ======================================
// GOOGLE LOGIN
// ======================================

export const googleLoginBody = z.object({
    idToken: z
        .string()
        .min(1, "Google ID Token is required"),
});

// ======================================
// REGISTER ADMIN
// ======================================

export const registerBody = z.object({
    username: z
        .string()
        .trim()
        .min(3)
        .max(50),

    email: z
        .string()
        .trim()
        .email(),

    password: z
        .string()
        .min(6)
        .max(100),
});

// ======================================
// CHANGE PASSWORD
// ======================================

export const changePasswordBody = z.object({
    currentPassword: z
        .string()
        .min(6),

    newPassword: z
        .string()
        .min(6)
        .max(100),
});

// ======================================
// FORGOT PASSWORD
// ======================================

export const forgotPasswordBody = z.object({
    email: z
        .string()
        .trim()
        .email(),
});

// ======================================
// RESET PASSWORD
// ======================================

export const resetPasswordBody = z.object({
    token: z
        .string()
        .min(10),

    password: z
        .string()
        .min(6)
        .max(100),
});

// ======================================
// REFRESH TOKEN
// ======================================

export const refreshTokenBody = z.object({
    refreshToken: z
        .string()
        .min(10),
});

// ======================================
// LOGOUT
// ======================================

export const logoutBody = z.object({
    refreshToken: z
        .string()
        .optional(),
});