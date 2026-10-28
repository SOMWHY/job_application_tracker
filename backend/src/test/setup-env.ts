// Runs before the test framework is installed, in the same process as tests.
// Sets environment variables so env.ts and db.ts read the test database.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://jat:jat_dev_password@localhost:5433/jat_test?sslmode=disable';
process.env.BETTER_AUTH_SECRET = 'test-secret-0123456789abcdef';
process.env.BETTER_AUTH_URL = 'http://localhost:4000';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
