import 'dotenv/config';

const env = (
  globalThis as typeof globalThis & {
    process: { env: Record<string, string | undefined> };
  }
).process.env;

env.NODE_ENV ??= 'development';
env.DEV_USER_ID ??= '22222222-2222-4222-8222-222222222222';
