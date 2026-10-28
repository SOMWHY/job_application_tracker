import { createApp } from '../index.js';
import { makeUser, signupAndLogin, resetDb } from './helpers.js';

describe('interview rounds', () => {
  const app = createApp();

  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
  });

  async function createApplication(agent: Awaited<ReturnType<typeof signupAndLogin>>) {
    const res = await agent.post('/api/applications').send({
      company: 'Interview Co',
      position: 'Engineer',
      appliedDate: '2026-10-20',
    });
    expect(res.status).toBe(201);
    return res.body.id as string;
  }

  it('creates a PENDING round without changing application status', async () => {
    const agent = await signupAndLogin(app, makeUser('iv-pending'));
    const applicationId = await createApplication(agent);

    const res = await agent
      .post(`/api/applications/${applicationId}/interviews`)
      .send({
        type: 'PHONE',
        scheduledAt: '2026-10-25T10:00:00.000Z',
        result: 'PENDING',
        feedback: '待确认时间',
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('PHONE');
    expect(res.body.result).toBe('PENDING');

    const application = await agent.get(`/api/applications/${applicationId}`);
    expect(application.body.status).toBe('PENDING');
    expect(application.body.statusHistory).toHaveLength(0);
  });

  it('PASS on HR round links application status to OFFER and writes StatusHistory', async () => {
    const agent = await signupAndLogin(app, makeUser('iv-pass-hr'));
    const applicationId = await createApplication(agent);

    const res = await agent
      .post(`/api/applications/${applicationId}/interviews`)
      .send({
        type: 'HR',
        scheduledAt: '2026-10-26T10:00:00.000Z',
        result: 'PASS',
        feedback: 'HR 通过',
      });

    expect(res.status).toBe(201);

    const application = await agent.get(`/api/applications/${applicationId}`);
    expect(application.body.status).toBe('OFFER');
    expect(application.body.statusHistory).toHaveLength(1);
    expect(application.body.statusHistory[0].fromStatus).toBe('PENDING');
    expect(application.body.statusHistory[0].toStatus).toBe('OFFER');
  });

  it('PASS on TECH round links application status to INTERVIEW', async () => {
    const agent = await signupAndLogin(app, makeUser('iv-pass-tech'));
    const applicationId = await createApplication(agent);

    const res = await agent
      .post(`/api/applications/${applicationId}/interviews`)
      .send({ type: 'TECH', scheduledAt: '2026-10-27T10:00:00.000Z', result: 'PASS' });

    expect(res.status).toBe(201);

    const application = await agent.get(`/api/applications/${applicationId}`);
    expect(application.body.status).toBe('INTERVIEW');
    expect(application.body.statusHistory).toHaveLength(1);
  });

  it('FAIL round links application status to REJECTED', async () => {
    const agent = await signupAndLogin(app, makeUser('iv-fail'));
    const applicationId = await createApplication(agent);

    const res = await agent
      .post(`/api/applications/${applicationId}/interviews`)
      .send({ type: 'ONSITE', scheduledAt: '2026-10-28T10:00:00.000Z', result: 'FAIL' });

    expect(res.status).toBe(201);

    const application = await agent.get(`/api/applications/${applicationId}`);
    expect(application.body.status).toBe('REJECTED');
    expect(application.body.statusHistory).toHaveLength(1);
    expect(application.body.statusHistory[0].toStatus).toBe('REJECTED');
  });

  it('rejects access to another user’s application rounds', async () => {
    const owner = await signupAndLogin(app, makeUser('iv-owner'));
    const intruder = await signupAndLogin(app, makeUser('iv-intruder'));
    const applicationId = await createApplication(owner);

    const list = await intruder.get(`/api/applications/${applicationId}/interviews`);
    expect(list.status).toBe(404);

    const create = await intruder
      .post(`/api/applications/${applicationId}/interviews`)
      .send({ type: 'HR', scheduledAt: '2026-10-29T10:00:00.000Z' });
    expect(create.status).toBe(404);
  });

  it('lists rounds ordered by scheduledAt and deletes a round', async () => {
    const agent = await signupAndLogin(app, makeUser('iv-delete'));
    const applicationId = await createApplication(agent);

    const first = await agent
      .post(`/api/applications/${applicationId}/interviews`)
      .send({ type: 'PHONE', scheduledAt: '2026-10-30T10:00:00.000Z' });
    const second = await agent
      .post(`/api/applications/${applicationId}/interviews`)
      .send({ type: 'TECH', scheduledAt: '2026-10-24T10:00:00.000Z' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const list = await agent.get(`/api/applications/${applicationId}/interviews`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].type).toBe('TECH');
    expect(list.body[1].type).toBe('PHONE');

    const del = await agent.delete(
      `/api/applications/${applicationId}/interviews/${second.body.id}`,
    );
    expect(del.status).toBe(204);

    const after = await agent.get(`/api/applications/${applicationId}/interviews`);
    expect(after.body).toHaveLength(1);
    expect(after.body[0].type).toBe('PHONE');
  });
});
