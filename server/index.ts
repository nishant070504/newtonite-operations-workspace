import { createRequire } from 'node:module';
import { createApp, type PrismaClientLike } from './app.js';

type PrismaRuntime = { PrismaClient: new () => PrismaClientLike & { $disconnect(): Promise<void> } };
const { PrismaClient } = createRequire(import.meta.url)('@prisma/client') as PrismaRuntime;
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) throw new Error('JWT_SECRET is required');

const app = createApp({ prisma, jwtSecret });
const server = app.listen(port, () => console.log(`API listening on port ${port}`));

async function shutdown() {
  await prisma.$disconnect();
  server.close();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
