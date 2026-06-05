import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';
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
              gender: input.gender || 'OTHER',
              phone: input.phone,
            },
          },
        }),
      },
      include: { studentProfile: true },
    });

    // Create email verification token
    const verificationToken = randomUUID();
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

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
      verificationToken, // In prod, email this instead
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

  async verifyEmail(token: string) {
    const record = await prisma.emailVerification.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      throw createError('Invalid or expired verification token', 400);
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    });

    await prisma.emailVerification.delete({ where: { token } });
    return { message: 'Email verified successfully' };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: { include: { block: true } } },
      omit: { passwordHash: true },
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
        primaryRole: data.role as any, // Lock in original role
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
      include: { studentProfile: true },
      omit: { passwordHash: true },
    });

    return user;
  }
}

export const authService = new AuthService();
