import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Lazy initialization - Prisma client is only created when first accessed
// This prevents errors during Next.js build when env vars might not be available
const prismaClientSingleton = () => {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

  if (!url) {
    console.error('WARNING: No database URL found. Database operations will fail.');
    // Return a PrismaClient anyway - it will fail on actual queries
    // This allows the build to succeed but runtime queries will error
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

// Use global in development to prevent multiple instances due to hot reload
// In production, create a new instance
let prismaInstance: PrismaClient | undefined;

const getPrismaClient = (): PrismaClient => {
  if (process.env.NODE_ENV === 'production') {
    if (!prismaInstance) {
      prismaInstance = prismaClientSingleton();
    }
    return prismaInstance;
  } else {
    if (!globalThis.prisma) {
      globalThis.prisma = prismaClientSingleton();
    }
    return globalThis.prisma;
  }
};

// Export a getter that lazily initializes
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return (client as any)[prop];
  },
});
