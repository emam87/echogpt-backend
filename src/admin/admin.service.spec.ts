import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlanName, SubStatus } from '@prisma/client';
import { CryptoService } from '../common/crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
    webSearch: {
      count: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    apiUsageLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    aiProvider: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockCryptoService = {
    decrypt: jest.fn((val) => `decrypted-${val}`),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return combined system statistics', async () => {
      mockPrismaService.user.count.mockResolvedValue(10);
      mockPrismaService.conversation.count.mockResolvedValue(25);
      mockPrismaService.message.count.mockResolvedValue(100);
      mockPrismaService.webSearch.count.mockResolvedValue(15);
      mockPrismaService.subscription.findMany.mockResolvedValue([
        { plan: { name: PlanName.FREE } },
        { plan: { name: PlanName.PREMIUM } },
        { plan: { name: PlanName.PREMIUM } },
      ]);
      mockPrismaService.apiUsageLog.count.mockResolvedValue(42);

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalUsers: 10,
        totalConversations: 25,
        totalMessages: 100,
        totalSearches: 15,
        activeSubscriptions: {
          free: 1,
          premium: 2,
        },
        requestsToday: 42,
      });
    });
  });

  describe('getHealth', () => {
    it('should return status ok and database connected when query succeeds', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const health = await service.getHealth();

      expect(health.status).toBe('ok');
      expect(health.database).toBe('connected');
      expect(typeof health.uptime).toBe('number');
      expect(typeof health.timestamp).toBe('string');
    });

    it('should return degraded status and error database status when query throws', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB failure'));

      const health = await service.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.database).toBe('error');
    });
  });

  describe('getUsers', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        {
          id: 'u1',
          email: 'user1@example.com',
          name: 'User One',
          role: { name: 'USER' },
          subscriptions: [{ plan: { name: PlanName.FREE } }],
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.getUsers(1, 20, 'user1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('user1@example.com');
      expect(result.data[0].currentPlan).toBe(PlanName.FREE);
      expect(result.total).toBe(1);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'r2',
        name: 'ADMIN',
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'u1',
        email: 'user1@example.com',
        name: 'User One',
        role: { name: 'ADMIN' },
        createdAt: new Date(),
      });

      const result = await service.updateUserRole('u1', { role: 'ADMIN' });

      expect(result.role).toBe('ADMIN');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('u1', { role: 'ADMIN' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('u1', { role: 'ADMIN' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscriptions', () => {
    it('should return paginated list of subscriptions', async () => {
      const mockSubs = [
        {
          id: 'sub-1',
          userId: 'u1',
          user: { email: 'user@example.com' },
          plan: { name: PlanName.PREMIUM },
          status: SubStatus.ACTIVE,
          startedAt: new Date(),
          endsAt: null,
        },
      ];

      mockPrismaService.subscription.findMany.mockResolvedValue(mockSubs);
      mockPrismaService.subscription.count.mockResolvedValue(1);

      const result = await service.getSubscriptions(1, 20, SubStatus.ACTIVE);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userEmail).toBe('user@example.com');
      expect(result.data[0].planName).toBe(PlanName.PREMIUM);
    });
  });

  describe('getProviders', () => {
    it('should return paginated AI providers with masked API keys', async () => {
      const mockProviders = [
        {
          id: 'p1',
          name: 'Claude',
          type: 'ANTHROPIC',
          model: 'claude-3-5-sonnet-20241022',
          encryptedApiKey: 'encrypted-secret-key-12345',
          isSystem: true,
          userId: null,
          user: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.aiProvider.findMany.mockResolvedValue(mockProviders);
      mockPrismaService.aiProvider.count.mockResolvedValue(1);

      const result = await service.getProviders(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].ownerEmail).toBe('system');
      expect(result.data[0].apiKey).toMatch(/^\*+/);
    });
  });

  describe('getAnalytics', () => {
    it('should return request metrics per day and per endpoint', async () => {
      mockPrismaService.apiUsageLog.findMany.mockResolvedValue([
        { createdAt: new Date() },
      ]);
      mockPrismaService.apiUsageLog.groupBy.mockResolvedValue([
        { endpoint: '/api/v1/chat', _count: { _all: 5 } },
      ]);

      const result = await service.getAnalytics();

      expect(result.requestsPerDay).toHaveLength(7);
      expect(result.requestsPerEndpoint).toEqual([
        { endpoint: '/api/v1/chat', count: 5 },
      ]);
    });
  });

  describe('getLogs', () => {
    it('should return paginated API usage logs filtered by userId and statusCode', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'u1',
          endpoint: '/api/v1/chat',
          method: 'POST',
          statusCode: 200,
          responseTimeMs: 150,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.apiUsageLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.apiUsageLog.count.mockResolvedValue(1);

      const result = await service.getLogs(1, 20, 'u1', 200);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].statusCode).toBe(200);
      expect(result.total).toBe(1);
    });
  });
});
