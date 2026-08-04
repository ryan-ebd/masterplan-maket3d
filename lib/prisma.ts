import { PrismaClient } from "@prisma/client";

// Singleton digantung di globalThis: HMR di `next dev` mengevaluasi ulang modul,
// tanpa ini PrismaClient beranak-pinak -> "too many connections" ke Postgres.
const g = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma = g.__prisma ?? (g.__prisma = new PrismaClient());
