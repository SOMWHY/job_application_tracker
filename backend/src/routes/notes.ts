import { Router } from 'express';
import { prisma } from '../db.js';
import { errors } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { noteSchema } from '../schemas/application.js';

// Mounted at /api/applications/:id/notes
export const notesRouter = Router({ mergeParams: true });

notesRouter.use(requireAuth);

// GET /api/applications/:id/notes
notesRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const applicationId = (req.params as { id: string }).id;

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw errors.notFound();
    }

    const notes = await prisma.note.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// POST /api/applications/:id/notes
notesRouter.post('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const applicationId = (req.params as { id: string }).id;
    const { content } = noteSchema.parse(req.body);

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw errors.notFound();
    }

    const note = await prisma.note.create({
      data: { applicationId, content },
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/applications/:id/notes/:noteId
notesRouter.delete('/:noteId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id: applicationId, noteId } = req.params as { id: string; noteId: string };

    const application = await prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw errors.notFound();
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, applicationId },
    });

    if (!note) {
      throw errors.notFound();
    }

    await prisma.note.delete({ where: { id: noteId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
