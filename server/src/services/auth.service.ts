import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';
import { sendPasswordResetEmail, sendOtpEmail } from '../utils/email';
import { blacklistToken } from '../utils/tokenBlacklist';
import { logger } from '../utils/logger';
import env from '../config/env';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';

// ── Token builder ────────────────────────────────────────────────────────────
function buildTokens(user: { id: string; email: string; role: string; primaryRole: string }) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    primaryRole: user.primaryRole,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function buildUserResponse(user: {
  id: string;
  email: string;
  role: string;
  primaryRole: string;
  isEmailVerified: boolean;
  studentProfile?: object | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    primaryRole: user.primaryRole,
    isEmailVerified: user.isEmailVerified,
    profile: user.studentProfile ?? null,
  };
}

// ── AuthService ──────────────────────────────────────────────────────────────
export class AuthService {

  // ── Register (email + password) ─────────────────────────────────────────
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      if (existing.isEmailVerified) {
        throw createError('Email already registered', 409);
      } else {
        // If the user hasn't verified their email, delete the old unverified record
        // so they can safely try registering again.
        await prisma.user.delete({ where: { email: input.email } });
      }
    }

    if (input.role === 'STUDENT' && !input.rollNumber) {
      throw createError('Roll number is required for students', 400);
    }

    if (input.role === 'STUDENT' && input.rollNumber) {
      const existingRoll = await prisma.studentProfile.findUnique({
        where: { rollNumber: input.rollNumber },
      });
      if (existingRoll) {
        throw createError('Roll number already registered', 409);
      }
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        primaryRole: input.role,
        ...(input.role === 'STUDENT' && {
          studentProfile: {
            create: {
              name: input.name,
              rollNumber: input.rollNumber!,
              department: input.department || 'Unknown',
              year: input.year || 1,
              gender: input.gender || ('OTHER' as any),
              phone: input.phone,
            },
          },
        }),
      },
      include: { studentProfile: true },
    }).catch((e: any) => {
      if (e?.code === 'P2002') {
        const field: string = e?.meta?.target?.[0] ?? 'field';
        const label = field === 'rollNumber' ? 'Roll number' : field === 'email' ? 'Email' : 'A value';
        throw createError(`${label} already exists`, 409);
      }
      throw e;
    });

    // 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = randomUUID();

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const studentName = input.role === 'STUDENT' ? (input.name || input.email) : input.email;
    sendOtpEmail(input.email, studentName, otp).catch((err) =>
      logger.warn('OTP email send failed (non-fatal):', err)
    );

    return {
      userId: user.id,
      email: user.email,
      requiresOtp: true,
      ...(env.SMTP_PASS ? {} : { devOtp: otp }),
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { studentProfile: true },
    });

    if (!user || !user.isActive) throw createError('Invalid credentials', 401);

    // Google-only accounts have no password
    if (!user.passwordHash) {
      throw createError('This account uses Google Sign-In. Please log in with Google.', 401);
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) throw createError('Invalid credentials', 401);

    if (!user.isEmailVerified) {
      throw createError('Please verify your email before logging in. Check your inbox for the OTP.', 403);
    }

    const tokens = buildTokens(user);
    return { user: buildUserResponse(user), ...tokens };
  }

  // ── Google OAuth Login / Register ────────────────────────────────────────
  // Called after Google verifies the user — idempotent (upsert pattern)
  async googleLogin(googleProfile: {
    googleId: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  }) {
    // Find by Google ID first, then by email (account linking)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleAccount: { googleId: googleProfile.googleId } },
          { email: googleProfile.email },
        ],
      },
      include: { studentProfile: true, googleAccount: true },
    });

    if (!user) {
      // First-time Google login → auto-register as STUDENT, email pre-verified
      user = await prisma.user.create({
        data: {
          email: googleProfile.email,
          passwordHash: null,        // No password for OAuth users
          role: 'STUDENT',
          primaryRole: 'STUDENT',
          isEmailVerified: true,     // Google already verified the email
          googleAccount: {
            create: {
              googleId: googleProfile.googleId,
              displayName: googleProfile.displayName,
              avatarUrl: googleProfile.avatarUrl,
            },
          },
        },
        include: { studentProfile: true, googleAccount: true },
      });
    } else if (!user.googleAccount) {
      // Existing email user linking their Google account for the first time
      await prisma.googleAccount.create({
        data: {
          userId: user.id,
          googleId: googleProfile.googleId,
          displayName: googleProfile.displayName,
          avatarUrl: googleProfile.avatarUrl,
        },
      });
      // Mark email as verified if not already
      if (!user.isEmailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        });
        user.isEmailVerified = true;
      }
    }

    if (!user.isActive) throw createError('Account is deactivated', 403);

    const tokens = buildTokens(user);
    return { user: buildUserResponse(user), ...tokens };
  }

  // ── Refresh Tokens ───────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });

      if (!user || !user.isActive) throw createError('User not found or inactive', 401);

      return buildTokens(user);
    } catch {
      throw createError('Invalid refresh token', 401);
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────────────────
  async verifyOtp(userId: string, otp: string) {
    const record = await prisma.emailVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw createError('No pending verification found. Please register again.', 400);
    if (record.expiresAt < new Date()) throw createError('OTP has expired. Please request a new one.', 400);
    if (record.otp !== otp) throw createError('Invalid OTP. Please check your email and try again.', 400);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
      include: { studentProfile: true },
    });

    await prisma.emailVerification.deleteMany({ where: { userId } });

    const tokens = buildTokens(user);
    return {
      user: { ...buildUserResponse(user), isEmailVerified: true },
      ...tokens,
    };
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────
  async resendOtp(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user) throw createError('User not found', 404);
    if (user.isEmailVerified) throw createError('Email is already verified', 409);

    await prisma.emailVerification.deleteMany({ where: { userId } });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.emailVerification.create({
      data: {
        userId,
        token: randomUUID(),
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const name = user.studentProfile?.name || user.email;
    await sendOtpEmail(user.email, name, otp);

    return {
      message: 'A new OTP has been sent to your email.',
      ...(env.SMTP_PASS ? {} : { devOtp: otp }),
    };
  }

  // ── Forgot Password ──────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { studentProfile: true },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive || !user.passwordHash) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const resetToken = randomUUID();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const userName = user.studentProfile?.name || email;
    await sendPasswordResetEmail(email, userName, resetToken);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  // ── Reset Password ───────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      throw createError('Invalid or expired reset token', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await prisma.passwordReset.delete({ where: { token } });
    return { message: 'Password reset successfully.' };
  }

  // ── Get Profile ──────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        primaryRole: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: { include: { block: true } },
        googleAccount: { select: { googleId: true, displayName: true, avatarUrl: true } },
      },
    });

    if (!user) throw createError('User not found', 404);
    return user;
  }

  // ── Update Profile (ABAC: only own profile) ──────────────────────────────
  async updateProfile(
    actorId: string,
    targetUserId: string,
    data: { name?: string; phone?: string; department?: string; year?: number; roomNumber?: string; rollNumber?: string; gender?: string }
  ) {
    // ABAC: only the account owner can update their profile (Admin bypasses this in adminCreateUser)
    if (actorId !== targetUserId) {
      throw createError('You can only update your own profile', 403);
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId }, include: { studentProfile: true } });
    if (!user) throw createError('User not found', 404);

    try {
      if (user.studentProfile) {
        await prisma.studentProfile.update({
          where: { userId: targetUserId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.department && { department: data.department }),
            ...(data.year && { year: data.year }),
            ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
          },
        });
      } else {
        // Upsert/Create profile if it doesn't exist (e.g., from Google Signup)
        await prisma.studentProfile.create({
          data: {
            userId: targetUserId,
            name: data.name || user.email.split('@')[0],
            phone: data.phone,
            department: data.department || 'Unknown',
            year: data.year || 1,
            gender: (data.gender as any) || 'OTHER',
            rollNumber: data.rollNumber || `UNKNOWN-${Math.floor(Math.random() * 10000)}`,
            roomNumber: data.roomNumber,
          }
        });
      }
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('rollNumber')) {
        throw createError('This roll number is already registered by another student.', 400);
      }
      throw error;
    }

    return this.getProfile(targetUserId);
  }

  // ── Admin Create User ────────────────────────────────────────────────────
  async adminCreateUser(data: {
    email: string; password: string; role: string; name?: string;
    rollNumber?: string; department?: string; year?: number; gender?: string; phone?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw createError('Email already registered', 409);

    const passwordHash = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role as any,
        primaryRole: data.role as any,
        isEmailVerified: true,
        isActive: true,
        ...(data.role === 'STUDENT' && data.rollNumber && {
          studentProfile: {
            create: {
              name: data.name || 'Student',
              rollNumber: data.rollNumber,
              department: data.department || 'Unknown',
              year: data.year || 1,
              gender: (data.gender as any) || 'OTHER',
              phone: data.phone,
            },
          },
        }),
      },
      select: {
        id: true, email: true, role: true, primaryRole: true,
        isEmailVerified: true, isActive: true, createdAt: true, studentProfile: true,
      },
    });
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async logout(jti: string, exp: number | undefined) {
    if (jti) {
      const ttl = exp ? exp - Math.floor(Date.now() / 1000) : 900;
      if (ttl > 0) await blacklistToken(jti, ttl);
    }
    return { message: 'Logged out successfully' };
  }

  // ── Delete Account (Self Deletion) ───────────────────────────────────────
  async deleteAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createError('User not found', 404);
    
    await prisma.user.delete({ where: { id: userId } });
    return { message: 'Account deleted successfully' };
  }
}

export const authService = new AuthService();
