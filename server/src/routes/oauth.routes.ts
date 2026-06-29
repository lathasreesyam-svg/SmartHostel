/**
 * Google OAuth 2.0 Routes
 *
 * Flow:
 *  1. Client → GET /api/v1/auth/google → redirects to Google consent screen
 *  2. Google → GET /api/v1/auth/google/callback?code=... → exchanges code
 *  3. Server issues JWT → redirects client to /auth/google/callback?token=...
 *
 * No passport.js needed — we use the OAuth2 flow manually for simplicity
 * and full control over the token lifecycle.
 */

import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import env from '../config/env';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

// In-memory CSRF state store (use Redis in multi-instance production)
const pendingStates = new Map<string, number>();

// ── Step 1: Redirect to Google ───────────────────────────────────────────────
router.get('/google', (_req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) {
    res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    });
    return;
  }

  // CSRF state token — prevents redirect attacks
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now() + 10 * 60 * 1000); // 10 min expiry

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ── Step 2: Google Callback ──────────────────────────────────────────────────
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  // User denied access
  if (error) {
    logger.warn('Google OAuth denied by user:', error);
    return res.redirect(`${env.CLIENT_URL}/auth/login?error=google_denied`);
  }

  // CSRF check
  const stateExpiry = pendingStates.get(state);
  if (!stateExpiry || Date.now() > stateExpiry) {
    logger.warn('Google OAuth invalid/expired state');
    return res.redirect(`${env.CLIENT_URL}/auth/login?error=invalid_state`);
  }
  pendingStates.delete(state);

  try {
    // Exchange authorization code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenRes.data;

    // Fetch user profile from Google
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    // Upsert user in DB, issue our JWT
    const { user, accessToken, refreshToken } = await authService.googleLogin({
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name,
      avatarUrl: profile.picture,
    });

    logger.info(`Google OAuth login: ${profile.email} (role: ${user.role})`);

    // Redirect to frontend with tokens in URL (frontend stores in memory/localStorage)
    const redirectUrl = new URL(`${env.CLIENT_URL}/auth/google/callback`);
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('refreshToken', refreshToken);
    redirectUrl.searchParams.set('role', user.role);

    res.redirect(redirectUrl.toString());
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${env.CLIENT_URL}/auth/login?error=oauth_failed`);
  }
});

// Cleanup expired states periodically (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of pendingStates.entries()) {
    if (now > expiry) pendingStates.delete(key);
  }
}, 15 * 60 * 1000);

export default router;
