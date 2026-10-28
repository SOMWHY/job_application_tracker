import 'dotenv/config';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const prisma = new PrismaClient();

async function main() {
  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true },
    secret: process.env.BETTER_AUTH_SECRET ?? 'seed-secret',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  });

  const email = 'demo@example.com';
  const password = 'demo-password-123';

  // Find or create demo user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: 'Demo User' },
    });
    user = result.user;
    // eslint-disable-next-line no-console
    console.log(`Created demo user: ${email}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`Demo user already exists: ${email}`);
  }

  if (!user) {
    throw new Error('Failed to create demo user');
  }

  // Delete existing demo applications to keep idempotent
  await prisma.application.deleteMany({ where: { userId: user.id } });

  const samples: Array<{
    company: string;
    position: string;
    appliedDate: string;
    status: ApplicationStatus;
    source: string;
    link: string | null;
    notes: string[];
  }> = [
    {
      company: 'Acme Inc',
      position: 'Frontend Engineer',
      appliedDate: '2026-10-20',
      status: 'INTERVIEW',
      source: 'BOSS',
      link: 'https://example.com/jobs/acme-frontend',
      notes: ['HR 电话初筛通过', '已约技术一面'],
    },
    {
      company: 'Globex',
      position: 'Backend Engineer',
      appliedDate: '2026-10-18',
      status: 'PENDING',
      source: '官网',
      link: null,
      notes: ['等待回复'],
    },
    {
      company: 'Initech',
      position: 'Fullstack Developer',
      appliedDate: '2026-10-15',
      status: 'REJECTED',
      source: '内推',
      link: 'https://example.com/jobs/initech-fullstack',
      notes: ['一面未过'],
    },
    {
      company: 'Umbrella Corp',
      position: 'Data Analyst',
      appliedDate: '2026-10-10',
      status: 'OFFER',
      source: 'BOSS',
      link: null,
      notes: ['拿到 Offer，薪资谈判中'],
    },
    {
      company: 'Stark Industries',
      position: 'DevOps Engineer',
      appliedDate: '2026-10-05',
      status: 'INTERVIEW',
      source: '官网',
      link: 'https://example.com/jobs/stark-devops',
      notes: [],
    },
  ];

  for (const s of samples) {
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        company: s.company,
        position: s.position,
        appliedDate: new Date(s.appliedDate),
        status: s.status,
        source: s.source,
        link: s.link,
      },
    });

    // Notes
    for (const content of s.notes) {
      await prisma.note.create({ data: { applicationId: application.id, content } });
    }

    // Status history (PENDING -> current)
    if (s.status !== 'PENDING') {
      await prisma.statusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: 'PENDING',
          toStatus: s.status,
        },
      });
    }

    // eslint-disable-next-line no-console
    console.log(`  - ${s.company} / ${s.position} [${s.status}]`);
  }

  // eslint-disable-next-line no-console
  console.log('\nSeed complete. Demo login:');
  // eslint-disable-next-line no-console
  console.log(`  email:    ${email}`);
  // eslint-disable-next-line no-console
  console.log(`  password: ${password}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
