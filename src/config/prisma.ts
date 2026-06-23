import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { env } from './env';

/**
 * Prisma 7 requires a database adapter.
 * Single shared Prisma instance for tsx watch.
 */


const pool = new Pool({
  connectionString: env.DATABASE_URL,
});


const adapter = new PrismaPg(pool);


const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};


export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,

    log:
      env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });


if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}


export default prisma;