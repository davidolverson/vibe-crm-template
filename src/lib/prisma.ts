import { PrismaClient } from '../generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DATABASE_URL || '';
if (!url) {
  throw new Error('DATABASE_URL is not set at prisma.ts evaluation time');
}
const connectionString = url.replace(/[&?]channel_binding=require/g, '');

// Local Postgres (dev + integration tests) uses the plain pg adapter; Neon
// serverless (prod on Coolify) uses the Neon adapter. Auto-detected from the
// connection host, so prod behavior is unchanged — only localhost swaps drivers.
const isLocalPg = /@(localhost|127\.0\.0\.1|host\.docker\.internal)(:|\/)/.test(connectionString);
const adapter = isLocalPg
  ? new PrismaPg({ connectionString })
  : new PrismaNeon({ connectionString });

export const prisma = new PrismaClient({ adapter });
