import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as { pool?: Pool };
// Do not connect during Next's build-time module evaluation. Database operations still
// fail normally at runtime when DATABASE_URL is not configured, rather than making builds impossible.
export const pool = globalForDb.pool ?? new Pool(connectionString ? { connectionString } : {});
if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;
export const db = drizzle(pool, { schema });
