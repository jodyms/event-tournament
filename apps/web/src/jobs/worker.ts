import 'dotenv/config';
import { pool } from '@/db/client';
import { processLocalOutbox } from '@/lib/infra/integrations';

async function run() {
  const count = await processLocalOutbox();
  console.log(`Processed ${count} local outbox job(s).`);
  await pool.end();
}
run().catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
