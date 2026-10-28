import { PrismaClient } from '@prisma/client';

// Singleton Prisma client shared across the app and tests.
export const prisma = new PrismaClient();
