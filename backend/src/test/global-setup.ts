import { execSync } from 'node:child_process';
import 'dotenv/config';

// Applies migrations to the test database before running the suite.
export default async function globalSetup() {
  const testDbUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://jat:jat_dev_password@localhost:5433/jat_test?sslmode=disable';

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDbUrl },
    });
    // eslint-disable-next-line no-console
    console.log('[globalSetup] test database migrated');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[globalSetup] failed to migrate test database', err);
    throw err;
  }
}
