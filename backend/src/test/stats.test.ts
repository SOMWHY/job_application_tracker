import { createApp } from '../index.js';
import { makeUser, signupAndLogin, resetDb } from './helpers.js';

describe('stats', () => {
  const app = createApp();

  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
  });

  it('returns correct status counts', async () => {
    const agent = await signupAndLogin(app, makeUser('stats'));

    const statuses = ['PENDING', 'PENDING', 'INTERVIEW', 'REJECTED', 'OFFER'];
    for (let i = 0; i < statuses.length; i++) {
      const res = await agent.post('/api/applications').send({
        company: `Company ${i}`,
        position: 'Dev',
        appliedDate: `2026-10-${String(i + 1).padStart(2, '0')}`,
        status: statuses[i],
      });
      expect(res.status).toBe(201);
    }

    const stats = await agent.get('/api/applications/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.total).toBe(5);
    expect(stats.body.counts.PENDING).toBe(2);
    expect(stats.body.counts.INTERVIEW).toBe(1);
    expect(stats.body.counts.REJECTED).toBe(1);
    expect(stats.body.counts.OFFER).toBe(1);
    expect(stats.body.recent.length).toBe(5);
  });
});
