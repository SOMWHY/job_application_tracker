import { Router } from 'express';
import type { ApplicationStatus } from '@prisma/client';
import { prisma } from '../db.js';
import { errors } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createInterviewRoundSchema } from '../schemas/interview.js';

// Mounted at /api/applications/:id/interviews
export const interviewsRouter = Router({ mergeParams: true });

interviewsRouter.use(requireAuth);

function linkedStatus(
  type: 'PHONE' | 'TECH' | 'ONSITE' | 'HR',
  result: 'PENDING' | 'PASS' | 'FAIL',
): ApplicationStatus | null {
  if (result === 'FAIL') return 'REJECTED';
  if (result === 'PASS') {
    return type === 'HR' || type === 'ONSITE' ? 'OFFER' : 'INTERVIEW';
  }
  return null;
}

// GET /api/applications/:id/interviews
interviewsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const applicationId = (req.params as { id: string }).id;

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw errors.notFound();
    }

    const rounds = await prisma.interviewRound.findMany({
      where: { applicationId },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(rounds);
  } catch (err) {
    next(err);
  }
});

// POST /api/applications/:id/interviews
interviewsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const applicationId = (req.params as { id: string }).id;
    const data = createInterviewRoundSchema.parse(req.body);

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw errors.notFound();
    }

    const targetStatus = linkedStatus(data.type, data.result ?? 'PENDING');

    const round = await prisma.$transaction(async (tx) => {
      const created = await tx.interviewRound.create({
        data: {
          applicationId,
          type: data.type,
          scheduledAt: new Date(data.scheduledAt),
          result: data.result ?? 'PENDING',
          feedback: data.feedback || null,
        },
      });

      if (targetStatus && application.status !== targetStatus) {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: targetStatus },
        });
        await tx.statusHistory.create({
          data: {
            applicationId,
            fromStatus: application.status,
            toStatus: targetStatus,
          },
        });
      }

      return created;
    });

    res.status(201).json(round);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/applications/:id/interviews/:interviewId
interviewsRouter.delete('/:interviewId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id: applicationId, interviewId } = req.params as {
      id: string;
      interviewId: string;
    };

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw errors.notFound();
    }

    const round = await prisma.interviewRound.findFirst({
      where: { id: interviewId, applicationId },
    });

    if (!round) {
      throw errors.notFound();
    }

    await prisma.interviewRound.delete({ where: { id: interviewId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
