import 'dotenv/config';
import { z } from 'zod';

/**
 * Validates and types every environment variable the app relies on.
 * If anything is missing or malformed, the process exits immediately with a
 * clear message instead of failing later with a cryptic runtime error.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Local default is 5000.
  // On Render, process.env.PORT will be used automatically.
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters'),

  JWT_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_SALT_ROUNDS: z
    .coerce
    .number()
    .int()
    .min(8)
    .max(15)
    .default(10),

  CORS_ORIGIN: z.string().default('*'),

  // Cloudflare R2
  R2_ACCOUNT_ID: z
    .string()
    .min(1, 'R2_ACCOUNT_ID is required'),

  R2_ACCESS_KEY_ID: z
    .string()
    .min(1, 'R2_ACCESS_KEY_ID is required'),

  R2_SECRET_ACCESS_KEY: z
    .string()
    .min(1, 'R2_SECRET_ACCESS_KEY is required'),

  R2_BUCKET_NAME: z
    .string()
    .min(1, 'R2_BUCKET_NAME is required')
    .default('flexiwalls'),

  R2_PUBLIC_URL: z
    .string()
    .url('R2_PUBLIC_URL must be a valid URL')
    .transform((url) => url.replace(/\/$/, '')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    '❌ Invalid environment variables:\n',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );

  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;