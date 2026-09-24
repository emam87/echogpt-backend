import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PlanName, SubStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(registerDto.password);

    let userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });
    if (!userRole) {
      userRole = await this.prisma.role.create({
        data: { name: 'USER' },
      });
    }

    let freePlan = await this.prisma.plan.findUnique({
      where: { name: PlanName.FREE },
    });
    if (!freePlan) {
      freePlan = await this.prisma.plan.create({
        data: {
          name: PlanName.FREE,
          dailyRequestLimit: 20,
          price: 0,
        },
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
        roleId: userRole.id,
        subscriptions: {
          create: {
            planId: freePlan.id,
            status: SubStatus.ACTIVE,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            planId: true,
            status: true,
            startedAt: true,
            endsAt: true,
            plan: {
              select: {
                name: true,
                dailyRequestLimit: true,
              },
            },
          },
        },
      },
    });

    return user;
  }

  async login(loginDto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.role.name,
      userAgent,
      ip,
    );

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; sid: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload || !payload.sid || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!session || session.revokedAt !== null || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const isValidToken = await argon2.verify(
      session.refreshTokenHash,
      refreshToken,
    );

    if (!isValidToken) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Invalid refresh token (token reuse detected)',
      );
    }

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = (this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m') as any;

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES') || '7d') as any;

    const newAccessToken = await this.jwtService.signAsync(
      { sub: session.userId, role: session.user.role.name, sid: session.id },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      },
    );

    const newRefreshToken = await this.jwtService.signAsync(
      { sub: session.userId, sid: session.id },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    const newRefreshTokenHash = await argon2.hash(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(sessionId?: string) {
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async generateTokens(
    userId: string,
    roleName: string,
    userAgent?: string,
    ip?: string,
  ) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = (this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m') as any;

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES') || '7d') as any;

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role: roleName, sid: sessionId },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, sid: sessionId },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      },
    );

    const refreshTokenHash = await argon2.hash(refreshToken);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        userAgent: userAgent || null,
        ip: ip || null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
