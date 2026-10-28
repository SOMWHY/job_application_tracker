import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';
import { env } from './env.js';
import { prisma } from './db.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { applicationsRouter } from './routes/applications.js';
import { notesRouter } from './routes/notes.js';
import { interviewsRouter } from './routes/interviews.js';

export function createApp() {
  const app = express();

  app.get('/', (_req, res) => {
    res.json({
      message: 'Job Application Tracker API',
      status: 'ok',
      health: '/health',
      auth: '/api/auth',
      applications: '/api/applications',
    });
  });

  // CORS
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );

  // Better Auth handler — mounted BEFORE express.json()
  app.all('/api/auth/*splat', toNodeHandler(auth));

  // Business routes: express.json() AFTER auth handler
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/applications', applicationsRouter);
  app.use('/api/applications/:id/notes', notesRouter);
  app.use('/api/applications/:id/interviews', interviewsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const isDirectRun =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectRun) {
  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
