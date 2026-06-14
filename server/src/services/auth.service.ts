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

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw createError('Email already registered', 409);
    }

    if (input.role === 'STUDENT' && !input.rollNumber) {
      throw createError('Roll number is required for students', 400);
    }

    // Check roll number uniqueness before attempting create
    if (input.role === 'STUDENT' && input.rollNumber) {
      const existingRoll = await prisma.studentProfile.findUnique({
        where: { rollNumber: input.rollNumber },
      });
      if (existingRoll) {
        throw createError('Roll number already registered. Please use a different roll number.', 409);
      }
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        primaryRole: input.role, // Lock in original role forever
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
        const label = field === 'rollNumber' ? 'Roll number'
          : field === 'email' ? 'Email'
          : 'A value';
        throw createError(`${label} already exists. Please use a different one.`, 409);
      }
      throw e;
    });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = randomUUID();

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Send OTP email (non-blocking — don't fail registration if email fails)
    const studentName = input.role === 'STUDENT' ? (input.name || input.email) : input.email;
    sendOtpEmail(input.email, studentName, otp).catch((err) =>
      logger.warn('Registration OTP email send failed:', err)
    );

    // Dev mode: expose otp in response for testing when no SMTP is configured
    return {
      userId: user.id,
      email: user.email,
      requiresOtp: true,
      ...(env.SMTP_PASS ? {} : { devOtp: otp }),
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { studentProfile: true },
    });

    if (!user || !user.isActive) {
      throw createError('Invalid credentials', 401);
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401);
    }

    // Block login if email is not verified
    if (!user.isEmailVerified) {
      throw createError('Please verify your email before logging in. Check your inbox for the OTP code.', 403);
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role, primaryRole: user.primaryRole });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email, role: user.role, primaryRole: user.primaryRole });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        primaryRole: user.primaryRole,
        isEmailVerified: user.isEmailVerified,
        profile: user.studentProfile,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });

      if (!user || !user.isActive) {
        throw createError('User not found or inactive', 401);
      }

      const newAccessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        primaryRole: user.primaryRole,
      });
      const newRefreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        primaryRole: user.primaryRole,
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw createError('Invalid refresh token', 401);
    }
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────────
  async verifyOtp(userId: string, otp: string) {
    const record = await prisma.emailVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw createError('No pending verification found. Please register again.', 400);
    }
    if (record.expiresAt < new Date()) {
      throw createError('OTP has expired. Please request a new one.', 400);
    }
    if (record.otp !== otp) {
      throw createError('Invalid OTP. Please check your email and try again.', 400);
    }

    // Mark email as verified
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
      include: { studentProfile: true },
    });

    // Clean up verification record
    await prisma.emailVerification.deleteMany({ where: { userId } });

    // Issue tokens — user is now fully authenticated
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role, primaryRole: user.primaryRole });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email, role: user.role, primaryRole: user.primaryRole });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        primaryRole: user.primaryRole,
        isEmailVerified: true,
        profile: user.studentProfile,
      },
      accessToken,
      refreshToken,
    };
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  async resendOtp(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    if (!user) throw createError('User not found', 404);
    if (user.isEmailVerified) throw createError('Email is already verified', 409);

    // Invalidate old OTPs for this user
    await prisma.emailVerification.deleteMany({ where: { userId } });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.emailVerification.create({
      data: {
        userId,
        token: randomUUID(),
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const name = user.studentProfile?.name || user.email;
    await sendOtpEmail(user.email, name, otp);

    return {
      message: 'A new OTP has been sent to your email.',
      ...(env.SMTP_PASS ? {} : { devOtp: otp }),
    };
  }

  // ── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { studentProfile: true },
    });

    // Always return success to prevent email enumeration attacks
    if (!user || !user.isActive) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    // Invalidate any existing reset tokens
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    // Create new reset token (1 hour expiry)
    const resetToken = randomUUID();
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const userName = user.studentProfile?.name || email;
    await sendPasswordResetEmail(email, userName, resetToken);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  // ── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      throw createError('Invalid or expired reset token. Please request a new one.', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    // Clean up — token is single-use
    await prisma.passwordReset.delete({ where: { token } });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

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
      },
    });

    if (!user) throw createError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, data: {
    name?: string; phone?: string; department?: string; year?: number; roomNumber?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { studentProfile: true } });
    if (!user) throw createError('User not found', 404);

    if (user.studentProfile) {
      await prisma.studentProfile.update({
        where: { userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.department && { department: data.department }),
          ...(data.year && { year: data.year }),
          ...(data.roomNumber !== undefined && { roomNumber: data.roomNumber }),
        },
      });
    }

    return this.getProfile(userId);
  }

  async adminCreateUser(data: {
    email: string; password: string; role: string; name?: string;
    rollNumber?: string; department?: string; year?: number; gender?: string; phone?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw createError('Email already registered', 409);

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
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
        id: true,
        email: true,
        role: true,
        primaryRole: true,
        isEmailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: true,
      },
    });

    return user;
  }
  // ── Logout (blacklist this token) ───────────────────────────────────────────
  async logout(jti: string, exp: number | undefined) {
    if (jti) {
      const ttl = exp ? exp - Math.floor(Date.now() / 1000) : 900; // default 15m
      if (ttl > 0) await blacklistToken(jti, ttl);
    }
    return { message: 'Logged out successfully' };
  }
}

export const authService = new AuthService();
