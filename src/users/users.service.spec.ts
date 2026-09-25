import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile with active subscription plan name', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isEmailVerified: true,
        createdAt: new Date(),
        role: { name: 'USER' },
        subscriptions: [{ plan: { name: 'FREE' } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        isEmailVerified: true,
        createdAt: mockUser.createdAt,
        plan: 'FREE',
        planName: 'FREE',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update name without changing email verification status', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-123', email: 'test@example.com' })
        .mockResolvedValueOnce({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Updated Name',
          isEmailVerified: true,
          createdAt: new Date(),
          role: { name: 'USER' },
          subscriptions: [{ plan: { name: 'FREE' } }],
        });

      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateProfile('user-123', {
        name: 'Updated Name',
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should set isEmailVerified to false if email is updated to a new email', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-123', email: 'old@example.com' }) // current user check
        .mockResolvedValueOnce(null) // uniqueness check
        .mockResolvedValueOnce({
          id: 'user-123',
          email: 'new@example.com',
          name: 'Test User',
          isEmailVerified: false,
          createdAt: new Date(),
          role: { name: 'USER' },
          subscriptions: [{ plan: { name: 'FREE' } }],
        }); // getProfile call

      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateProfile('user-123', {
        email: 'new@example.com',
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          email: 'new@example.com',
          isEmailVerified: false,
        },
      });
      expect(result.email).toBe('new@example.com');
      expect(result.isEmailVerified).toBe(false);
    });

    it('should throw ConflictException if updated email is already taken by another user', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-123', email: 'old@example.com' })
        .mockResolvedValueOnce({ id: 'user-456', email: 'taken@example.com' });

      await expect(
        service.updateProfile('user-123', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePassword', () => {
    it('should verify current password, update hash, and revoke active sessions', async () => {
      const hashedPass = await argon2.hash('OldPassword123!');
      mockPrismaService.user.findUnique.mockResolvedValue({
        passwordHash: hashedPass,
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.updatePassword('user-123', {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(prismaService.user.update).toHaveBeenCalled();
      expect(prismaService.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.message).toContain('Password updated successfully');
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const hashedPass = await argon2.hash('OldPassword123!');
      mockPrismaService.user.findUnique.mockResolvedValue({
        passwordHash: hashedPass,
      });

      await expect(
        service.updatePassword('user-123', {
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user record', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.user.delete.mockResolvedValue({});

      await service.deleteUser('user-123');

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw NotFoundException if user to delete is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
