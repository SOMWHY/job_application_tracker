import { createApp } from '../index.js';
import { makeUser, signupAndLogin, resetDb } from './helpers.js';

describe('applications CRUD', () => {
  const app = createApp();

  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
  });

  it('creates, reads, updates, deletes an application', async () => {
    const agent = await signupAndLogin(app, makeUser('crud'));

    // Create
    const createRes = await agent.post('/api/applications').send({
      company: 'Acme',
      position: 'Engineer',
      appliedDate: '2026-10-20',
      source: 'BOSS',
    });
    expect(createRes.status).toBe(201);
    const id = createRes.body.id;
    expect(createRes.body.status).toBe('PENDING');

    // Read list
    const listRes = await agent.get('/api/applications');
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.pagination.total).toBe(1);

    // Read single
    const getRes = await agent.get(`/api/applications/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.company).toBe('Acme');

    // Update
    const updateRes = await agent.patch(`/api/applications/${id}`).send({
      company: 'Acme Updated',
      position: 'Senior Engineer',
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.company).toBe('Acme Updated');
    expect(updateRes.body.position).toBe('Senior Engineer');

    // Change status
    const statusRes = await agent.patch(`/api/applications/${id}/status`).send({
      status: 'INTERVIEW',
    });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('INTERVIEW');

    // Delete
    const deleteRes = await agent.delete(`/api/applications/${id}`);
    expect(deleteRes.status).toBe(204);

    // Verify gone
    const afterDelete = await agent.get(`/api/applications/${id}`);
    expect(afterDelete.status).toBe(404);
  });

  it('prevents duplicate PENDING applications for same company/position/date', async () => {
    const agent = await signupAndLogin(app, makeUser('dup'));

    const payload = {
      company: 'Dupe Corp',
      position: 'Dev',
      appliedDate: '2026-10-21',
    };

    const first = await agent.post('/api/applications').send(payload);
    expect(first.status).toBe(201);

    const second = await agent.post('/api/applications').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('allows re-applying after a non-PENDING status (no false conflict)', async () => {
    const agent = await signupAndLogin(app, makeUser('reapply'));

    const payload = {
      company: 'Reapply Corp',
      position: 'Dev',
      appliedDate: '2026-10-22',
    };

    const first = await agent.post('/api/applications').send(payload);
    expect(first.status).toBe(201);
    const id = first.body.id;

    // Move to REJECTED
    await agent.patch(`/api/applications/${id}/status`).send({ status: 'REJECTED' });

    // Re-apply same company/position/date
    const second = await agent.post('/api/applications').send(payload);
    expect(second.status).toBe(201);
  });
});
