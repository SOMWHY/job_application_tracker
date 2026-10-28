import request from 'supertest';
import { createApp } from '../index.js';
import { resetDb } from './helpers.js';

describe('auth & authorization', () => {
  const app = createApp();

  beforeAll(async () => {
    await resetDb();
  });

  it('returns 401 when accessing business endpoint without session', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when accessing stats without session', async () => {
    const res = await request(app).get('/api/applications/stats');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
