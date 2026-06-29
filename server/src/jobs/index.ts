/**
 * Background Jobs (node-cron)
 *
 * Scheduled tasks that keep the database clean and system healthy.
 * Called once from app.ts bootstrap.
 */

import cron from 'node-cron';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export function startBackgroundJobs() {

  // ── Cleanup expired idempotency keys (daily at 2am) ─────────────────────
  // Idempotency keys are stored for 24h to deduplicate retried requests.
  // This job removes expired ones to prevent unbounded table growth.
  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await prisma.idempotencyKey.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`[cron] Cleaned up ${result.count} expired idempotency keys`);
    } catch (err) {
      logger.error('[cron] Idempotency key cleanup failed:', err);
    }
  });

  // ── Cleanup expired OTP / email verification records (every hour) ────────
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await prisma.emailVerification.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        logger.info(`[cron] Cleaned up ${result.count} expired OTP records`);
      }
    } catch (err) {
      logger.error('[cron] OTP cleanup failed:', err);
    }
  });

  // ── Cleanup expired password reset tokens (every 6 hours) ────────────────
  cron.schedule('0 */6 * * *', async () => {
    try {
      const result = await prisma.passwordReset.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) {
        logger.info(`[cron] Cleaned up ${result.count} expired password reset tokens`);
      }
    } catch (err) {
      logger.error('[cron] Password reset token cleanup failed:', err);
    }
  });

  logger.info('🕐 Background jobs scheduled');
}
