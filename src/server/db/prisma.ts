import { PrismaClient } from '@prisma/client';

// This creates a single instance of Prisma to use throughout your backend
export const prisma = new PrismaClient();