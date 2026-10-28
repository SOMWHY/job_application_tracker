import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../db.js';

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export function makeUser(prefix: string): TestUser {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `${prefix}-${suffix}@example.com`,
    password: 'password-123',
    name: `Test ${prefix}`,
  };
}

// Signs up a user via Better Auth and returns an authenticated supertest agent.
export async function signupAndLogin(app: Express, user: TestUser) {
  const agent = request.agent(app);

  const signup = await agent.post('/api/auth/sign-up/email').send({
    email: user.email,
    password: user.password,
    name: user.name,
  });

  if (signup.status !== 200) {
    throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
  }

  return agent;
}

// Wipes all business + auth data (order matters for FK constraints).
export async function resetDb() {
  await prisma.interviewRound.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.note.deleteMany();
  await prisma.application.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}
