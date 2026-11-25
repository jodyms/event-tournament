import 'dotenv/config';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set in apps/web/.env before resetting the development database.');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // This is intentionally a development-only command. Drizzle keeps its history in
    // the drizzle schema, so reset both schemas to allow a clean migration replay.
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;');
    console.log('Development database and Drizzle migration metadata have been reset. Run npm run db:migrate && npm run db:seed next. Use npm run db:seed:demo when a full local dataset is needed.');
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
