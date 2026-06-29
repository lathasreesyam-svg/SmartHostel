import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import env from './config/env';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { initSocketHandlers } from './sockets';
import { startBackgroundJobs } from './jobs';

// Routes
import authRoutes from './routes/auth.routes';
import oauthRoutes from './routes/oauth.routes';
import complaintRoutes from './routes/complaint.routes';
import rebateRoutes from './routes/rebate.routes';
import menuRoutes from './routes/menu.routes';
import notificationRoutes from './routes/notification.routes';
import attendanceRoutes from './routes/attendance.routes';
import inventoryRoutes from './routes/inventory.routes';
import analyticsRoutes from './routes/analytics.routes';
import workerRoutes from './routes/worker.routes';
import adminRoutes from './routes/admin.routes';
import feedbackRoutes from './routes/feedback.routes';
import chatRoutes from './routes/chat.routes';

const app = express();
const httpServer = createServer(app);

// ── Socket.IO ──────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocketHandlers(io);

// ── Security Middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

if (env.CLIENT_URL && env.CLIENT_URL !== '*') {
  ALLOWED_ORIGINS.push(env.CLIENT_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.CLIENT_URL === '*') return callback(null, true);
      if (
        origin.endsWith('.up.railway.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  })
);

// ── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Strict limit on auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/v1/auth', authLimiter);

// ── General Middleware ─────────────────────────────────────────────────────
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '2.0.0',
    services: {
      database: 'connected',
      redis: env.REDIS_URL ? 'configured' : 'disabled',
      googleOauth: env.GOOGLE_CLIENT_ID ? 'configured' : 'not_configured',
    },
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', oauthRoutes);       // Google OAuth (no auth middleware needed)
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/rebates', rebateRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/chat', chatRoutes);

// ── 404 & Error Handling ───────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    startBackgroundJobs();

    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 SmartHostel Core API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`📡 Socket.IO ready`);
      logger.info(`🔗 API: http://localhost:${env.PORT}/api/v1`);
      if (env.GOOGLE_CLIENT_ID) {
        logger.info(`🔑 Google OAuth: configured`);
      } else {
        logger.warn(`⚠️  Google OAuth: NOT configured (set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export { io };
export default app;
