import app from './app';
import { env } from './config/env';
import prisma from './config/prisma';


const server = app.listen(
  env.PORT,
  '0.0.0.0',
  () => {

    console.log(
      `🚀 VividWalls API running on http://0.0.0.0:${env.PORT} [${env.NODE_ENV}]`
    );

  }
);

/** Close the HTTP server and DB pool cleanly on shutdown signals. */
const shutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
