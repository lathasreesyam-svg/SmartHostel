import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { isTokenBlacklisted } from '../utils/tokenBlacklist';
import { logger } from '../utils/logger';
import { hasPermission, type Permission } from '../config/permissions';

export interface AuthRequest extends Request {
  user?: {
    jti: string;
    userId: string;
    email: string;
    role: string;
    primaryRole: string;
    exp?: number;
  };
}

// ── Authenticate: verify JWT, check blacklist ────────────────────────────────
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    // Check if this specific token was revoked (logout/deactivation)
    if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
      res.status(401).json({ success: false, message: 'Token has been revoked. Please log in again.' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { error });
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ── RBAC: legacy role-based authorize (kept for simple cases) ────────────────
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    // Allow access if current role OR original primaryRole matches
    const hasAccess = roles.includes(req.user.role) || roles.includes(req.user.primaryRole);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

// ── RBAC via permission matrix ───────────────────────────────────────────────
// Checks the central permissions.ts matrix — use this on all new routes
export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const allowed = hasPermission(req.user.role, req.user.primaryRole, permission);
    if (!allowed) {
      logger.warn('Permission denied', {
        userId: req.user.userId,
        role: req.user.role,
        permission,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        message: `Forbidden. Permission required: ${permission}`,
      });
      return;
    }

    next();
  };
}
