import 'dotenv/config';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';
import { OUTSIDER_USER_ID } from './constants.js';

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const migrateScript = path.join(
    scriptDir,
    '..',
    '..',
    'scripts',
    'migrate.ts',
  );
  await execFileAsync('npx', ['tsx', migrateScript], {
    env: process.env,
  });
}

export async function withDbClient<T>(
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function resetTaskData(): Promise<void> {
  await withDbClient(async (client) => {
    await client.query('DELETE FROM tasks');
    await client.query(
      `INSERT INTO users (id, email, display_name)
       VALUES ($1, 'outsider@example.test', 'Outside User')
       ON CONFLICT (email) DO NOTHING`,
      [OUTSIDER_USER_ID],
    );
  });
}
