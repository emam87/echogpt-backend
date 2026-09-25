import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePasswordDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        role: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeSub = user.subscriptions[0];
    const planName = activeSub?.plan?.name ?? 'FREE';

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      plan: planName,
      planName: planName,
    };
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const isEmailChanging =
      updateUserDto.email !== undefined &&
      updateUserDto.email !== currentUser.email;

    if (isEmailChanging && updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email is already taken');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateUserDto.name !== undefined && { name: updateUserDto.name }),
        ...(isEmailChanging && {
          email: updateUserDto.email,
          isEmailVerified: false,
        }),
      },
    });

    return this.getProfile(userId);
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      updatePasswordDto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const newPasswordHash = await argon2.hash(updatePasswordDto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message:
        'Password updated successfully. All active sessions have been revoked.',
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });
  }
}




