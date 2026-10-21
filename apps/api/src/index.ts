import 'dotenv/config';
import { createApp } from './app.js';
import { db } from './db.js';

const app = createApp();

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`TaskManagement API listening on http://127.0.0.1:${port}`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down`);

  server.close(async (error) => {
    if (error) console.error('HTTP server shutdown error', error);
    try {
      await db.end();
      process.exit(error ? 1 : 0);
    } catch (shutdownError) {
      console.error('Database shutdown error', shutdownError);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
