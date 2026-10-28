import { defineConfig, devices } from '@playwright/test';

const API_URL = 'http://localhost:4000';
const APP_URL = 'http://localhost:5173';

const E2E_DATABASE_URL =
  'postgresql://jat:jat_dev_password@localhost:5433/jat_e2e?sslmode=disable';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node dist/index.js',
      url: `${API_URL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../backend',
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        BETTER_AUTH_SECRET: 'e2e-secret-0123456789abcdef',
        BETTER_AUTH_URL: API_URL,
        CORS_ORIGIN: APP_URL,
        PORT: '4000',
        NODE_ENV: 'development',
      },
    },
    {
      command: 'npm run dev',
      url: APP_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
