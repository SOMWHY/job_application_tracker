import { createApp } from '../index.js';
import { prisma } from '../db.js';
import { makeUser, signupAndLogin, resetDb } from './helpers.js';

describe('data isolation & cascade', () => {
  const app = createApp();

  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await resetDb();
  });

  it("user A cannot read user B's application (404, not 403)", async () => {
    const agentA = await signupAndLogin(app, makeUser('a'));
    const agentB = await signupAndLogin(app, makeUser('b'));

    // A creates an application
    const createRes = await agentA.post('/api/applications').send({
      company: 'Private Corp',
      position: 'Secret',
      appliedDate: '2026-10-23',
    });
    expect(createRes.status).toBe(201);
    const appId = createRes.body.id;

    // B tries to read it — must be 404
    const getRes = await agentB.get(`/api/applications/${appId}`);
    expect(getRes.status).toBe(404);

    // B tries to PATCH it — 404
    const patchRes = await agentB.patch(`/api/applications/${appId}`).send({ company: 'Hacked' });
    expect(patchRes.status).toBe(404);

    // B tries to DELETE it — 404
    const delRes = await agentB.delete(`/api/applications/${appId}`);
    expect(delRes.status).toBe(404);

    // B's own list is empty
    const listRes = await agentB.get('/api/applications');
    expect(listRes.body.items.length).toBe(0);
  });

  it('deleting an application cascades to notes and status history', async () => {
    const agent = await signupAndLogin(app, makeUser('cascade'));

    const createRes = await agent.post('/api/applications').send({
      company: 'Cascade Corp',
      position: 'Dev',
      appliedDate: '2026-10-24',
    });
    const appId = createRes.body.id;

    // Add note
    await agent.post(`/api/applications/${appId}/notes`).send({ content: 'hello note' });
    // Change status to create history
    await agent.patch(`/api/applications/${appId}/status`).send({ status: 'OFFER' });

    // Verify note + history exist
    expect(await prisma.note.count({ where: { applicationId: appId } })).toBe(1);
    expect(await prisma.statusHistory.count({ where: { applicationId: appId } })).toBe(1);

    // Delete
    const delRes = await agent.delete(`/api/applications/${appId}`);
    expect(delRes.status).toBe(204);

    // Verify cascaded
    expect(await prisma.note.count({ where: { applicationId: appId } })).toBe(0);
    expect(await prisma.statusHistory.count({ where: { applicationId: appId } })).toBe(0);
  });
});
