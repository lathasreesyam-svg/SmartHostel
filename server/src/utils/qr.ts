import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { randomUUID } from 'crypto';

export interface QRPayload {
  userId: string;
  scheduleId: string;
  token: string;
  exp: number;
}

/**
 * Generate a signed QR token valid for 15 minutes
 */
export function generateQRToken(userId: string, scheduleId: string): string {
  const payload: Omit<QRPayload, 'exp'> = {
    userId,
    scheduleId,
    token: randomUUID(),
  };
  return jwt.sign(payload, env.QR_SECRET, { expiresIn: '15m' });
}

/**
 * Verify and decode a QR token
 */
export function verifyQRToken(token: string): QRPayload | null {
  try {
    return jwt.verify(token, env.QR_SECRET) as QRPayload;
  } catch {
    return null;
  }
}

/**
 * Convert a QR token string to a base64 PNG data URL
 */
export async function generateQRCodeDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });
}
