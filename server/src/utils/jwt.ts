import jwt from 'jsonwebtoken';
import env from '../config/env';
import { randomUUID } from 'crypto';

export interface JwtPayload {
  jti: string;   // Unique token ID — used for blacklisting on logout
  userId: string;
  email: string;
  role: string;
  primaryRole: string; // Original base role — never overwritten on elevation
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'>): string {
  const jti = randomUUID();
  return jwt.sign({ ...payload, jti }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'>): string {
  const jti = randomUUID();
  return jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
