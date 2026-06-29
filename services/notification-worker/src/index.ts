/**
 * Notification Worker Microservice
 *
 * Responsibilities:
 *  - Subscribe to Redis channel "notifications:email"
 *  - Parse message payload: { to, subject, html }
 *  - Send email via Nodemailer (SMTP)
 *  - Log success / failure
 *  - NEVER crash the subscriber on a single email failure
 *  - Reconnect to Redis automatically on disconnect
 *
 * This service is intentionally decoupled from the core API.
 * If it crashes, emails are queued in Redis and processed on restart.
 * Core API is never blocked by email delivery.
 *
 * Scale: run multiple instances — Redis pub/sub fans out to all,
 *         so use Redis Streams (XADD/XREADGROUP) for exactly-once in production.
 */

import Redis from 'ioredis';
import nodemailer from 'nodemailer';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CHANNEL = 'notifications:email';

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS || '',
  },
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@smarthostel.edu';

// ── Mailer setup ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport(SMTP_CONFIG);

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
}

// ── Redis subscriber with auto-reconnect ──────────────────────────────────────
function createSubscriber(): Redis {
  const sub = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Infinite retries for subscriber
    enableReadyCheck: false,
    lazyConnect: false,
  });

  sub.on('connect', () => console.log('[notification-worker] ✅ Redis connected'));
  sub.on('error', (err) => console.error('[notification-worker] ⚠️ Redis error:', err.message));
  sub.on('close', () => {
    console.warn('[notification-worker] Redis connection closed, reconnecting in 5s...');
    setTimeout(() => sub.connect().catch(console.error), 5000);
  });

  return sub;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('[notification-worker] Starting...');

  // Verify SMTP (non-fatal — still start even if SMTP is not configured)
  if (SMTP_CONFIG.auth.pass) {
    try {
      await transporter.verify();
      console.log('[notification-worker] ✅ SMTP connection verified');
    } catch (err: any) {
      console.warn('[notification-worker] ⚠️ SMTP not available:', err.message);
    }
  } else {
    console.warn('[notification-worker] ⚠️ SMTP_PASS not set — emails will be logged only');
  }

  const subscriber = createSubscriber();

  await subscriber.subscribe(CHANNEL, (err) => {
    if (err) {
      console.error('[notification-worker] Failed to subscribe:', err.message);
      process.exit(1);
    }
    console.log(`[notification-worker] 📬 Subscribed to "${CHANNEL}"`);
  });

  subscriber.on('message', async (channel, message) => {
    if (channel !== CHANNEL) return;

    let payload: { to: string; subject: string; html: string };

    try {
      payload = JSON.parse(message);
    } catch {
      console.error('[notification-worker] Invalid JSON in message:', message);
      return; // Skip malformed messages — don't crash
    }

    if (!payload.to || !payload.subject || !payload.html) {
      console.error('[notification-worker] Missing required email fields:', payload);
      return;
    }

    try {
      if (SMTP_CONFIG.auth.pass) {
        await sendEmail(payload.to, payload.subject, payload.html);
        console.log(`[notification-worker] ✉️  Email sent to ${payload.to}: "${payload.subject}"`);
      } else {
        // Dev mode: just log
        console.log(`[notification-worker] 📧 [DEV] Would send email to ${payload.to}: "${payload.subject}"`);
      }
    } catch (err: any) {
      // Log but don't rethrow — one failed email must not kill the subscriber
      console.error(`[notification-worker] ❌ Failed to send to ${payload.to}:`, err.message);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[notification-worker] SIGTERM received, shutting down...');
    await subscriber.quit();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await subscriber.quit();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[notification-worker] Fatal error:', err);
  process.exit(1);
});
