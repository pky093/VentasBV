import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFound } from './lib/errors.js';
import { requireAuth } from './middleware/auth.js';

import { authRouter } from './modules/auth/router.js';
import { platformRouter } from './modules/platform/router.js';
import { tenantsRouter } from './modules/tenants/router.js';

export const app = express();

app.use((req, res, next) => {
  req.id = randomUUID();
  next();
});

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id as string,
    autoLogging: env.NODE_ENV !== 'test',
  })
);

app.use(helmet());
app.use(
  cors({
    origin: env.WEB_URL,
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/platform', requireAuth, platformRouter);
app.use('/api/v1/tenants', requireAuth, tenantsRouter);

app.use(notFound);
app.use(errorHandler);
