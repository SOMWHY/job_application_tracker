import { Router } from 'express';
import { prisma } from '../db.js';
import { errors } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  listQuerySchema,
} from '../schemas/application.js';

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

// GET /api/applications/stats (must be registered before /:id)
applicationsRouter.get('/stats', async (req, res, next) => {
  try {
    const userId = req.userId!;

    const grouped = await prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });

    const counts = {
      PENDING: 0,
      INTERVIEW: 0,
      REJECTED: 0,
      OFFER: 0,
    };

    for (const g of grouped) {
      counts[g.status] = g._count._all;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    const recent = await prisma.application.findMany({
      where: { userId },
      orderBy: { appliedDate: 'desc' },
      take: 5,
    });

    res.json({ total, counts, recent });
  } catch (err) {
    next(err);
  }
});

// GET /api/applications
applicationsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const query = listQuerySchema.parse(req.query);

    const where: Record<string, unknown> = { userId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.q) {
      where.OR = [
        { company: { contains: query.q, mode: 'insensitive' } },
        { position: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { appliedDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { notes: true } } },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/applications
applicationsRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const data = createApplicationSchema.parse(req.body);

    const appliedDate = new Date(data.appliedDate);

    // Atomic duplicate check + create inside a transaction, so two concurrent
    // requests cannot both pass the pre-check. The partial unique index in the
    // database is the final backstop (mapped to 409 in error middleware).
    const application = await prisma.$transaction(async (tx) => {
      const existing = await tx.application.findFirst({
        where: {
          userId,
          company: data.company,
          position: data.position,
          appliedDate,
          status: 'PENDING',
        },
      });

      if (existing) {
        throw errors.conflict(
          'A PENDING application with the same company, position and date already exists',
        );
      }

      return tx.application.create({
        data: {
          userId,
          company: data.company,
          position: data.position,
          appliedDate,
          status: data.status ?? 'PENDING',
          source: data.source || null,
          link: data.link || null,
        },
      });
    });

    // Record initial status history entry if created with non-default status
    if (application.status !== 'PENDING') {
      await prisma.statusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: 'PENDING',
          toStatus: application.status,
        },
      });
    }

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

// GET /api/applications/:id
applicationsRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const application = await prisma.application.findFirst({
      where: { id: req.params.id, userId },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        interviewRounds: { orderBy: { scheduledAt: 'asc' } },
      },
    });

    if (!application) {
      throw errors.notFound();
    }

    res.json(application);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/applications/:id
applicationsRouter.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const data = updateApplicationSchema.parse(req.body);

    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw errors.notFound();
    }

    const update: Record<string, unknown> = {};
    if (data.company !== undefined) update.company = data.company;
    if (data.position !== undefined) update.position = data.position;
    if (data.appliedDate !== undefined) update.appliedDate = new Date(data.appliedDate);
    if (data.source !== undefined) update.source = data.source || null;
    if (data.link !== undefined) update.link = data.link || null;

    const application = await prisma.application.update({
      where: { id: req.params.id },
      data: update,
    });

    res.json(application);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/applications/:id/status
applicationsRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { status } = updateStatusSchema.parse(req.body);

    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw errors.notFound();
    }

    if (existing.status === status) {
      res.json(existing);
      return;
    }

    const [application] = await prisma.$transaction([
      prisma.application.update({
        where: { id: req.params.id },
        data: { status },
      }),
      prisma.statusHistory.create({
        data: {
          applicationId: req.params.id,
          fromStatus: existing.status,
          toStatus: status,
        },
      }),
    ]);

    res.json(application);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/applications/:id
applicationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const existing = await prisma.application.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw errors.notFound();
    }

    await prisma.application.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
