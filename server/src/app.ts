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

// Routes
import authRoutes from './routes/auth.routes';
import complaintRoutes from './routes/complaint.routes';
import rebateRoutes from './routes/rebate.routes';
import menuRoutes from './routes/menu.routes';
import notificationRoutes from './routes/notification.routes';
import attendanceRoutes from './routes/attendance.routes';
import inventoryRoutes from './routes/inventory.routes';
import analyticsRoutes from './routes/analytics.routes';
import workerRoutes from './routes/worker.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import feedbackRoutes from './routes/feedback.routes';
import chatRoutes from './routes/chat.routes';

const app = express();
const httpServer = createServer(app);

// ── Socket.IO ──
const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocketHandlers(io);

// ── Security Middleware ──
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

// Add CLIENT_URL from env if it's a real URL (not '*')
if (env.CLIENT_URL && env.CLIENT_URL !== '*') {
  ALLOWED_ORIGINS.push(env.CLIENT_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
      if (!origin) return callback(null, true);

      // Allow all origins if CLIENT_URL is set to wildcard
      if (env.CLIENT_URL === '*') return callback(null, true);

      // Allow any Railway or Render deployment URL dynamically
      if (
        origin.endsWith('.up.railway.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      // Allow exact matches from the list
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use('/api/', limiter);

// ── General Middleware ──
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Health Check ──
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
});

// ── API Routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/rebates', rebateRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/chat', chatRoutes);

// ── 404 & Error Handling ──
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ──
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();

    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📡 Socket.IO ready`);
      logger.info(`🔗 API: http://localhost:${env.PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export { io };
export default app;
