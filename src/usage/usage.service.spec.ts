import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SubStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  let service: UsageService;
  let prismaService: any;

  const mockPrismaService = {
    subscription: {
      findFirst: jest.fn(),
    },
    apiUsageLog: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
    prismaService = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('getUsageInfo', () => {
    it('should return usage info with remaining count and next UTC midnight resetsAt', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: { dailyRequestLimit: 20 },
      });
      mockPrismaService.apiUsageLog.count.mockResolvedValue(5);

      const result = await service.getUsageInfo('user-1');

      expect(result.dailyLimit).toBe(20);
      expect(result.usedToday).toBe(5);
      expect(result.remaining).toBe(15);
      expect(result.resetsAt).toBeInstanceOf(Date);
      expect(prismaService.apiUsageLog.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
          statusCode: { lt: 400 },
          OR: [
            { endpoint: { startsWith: '/api/v1/chat' } },
            { endpoint: { startsWith: '/api/v1/search' } },
          ],
        },
      });
    });

    it('should fallback to 20 limit if user has no active subscription record', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.apiUsageLog.count.mockResolvedValue(0);

      const result = await service.getUsageInfo('user-1');

      expect(result.dailyLimit).toBe(20);
      expect(result.usedToday).toBe(0);
      expect(result.remaining).toBe(20);
    });
  });

  describe('assertWithinLimit', () => {
    it('should pass without throwing if usedToday < dailyLimit', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: { dailyRequestLimit: 20 },
      });
      mockPrismaService.apiUsageLog.count.mockResolvedValue(10);

      await expect(service.assertWithinLimit('user-1')).resolves.not.toThrow();
    });

    it('should throw 429 Too Many Requests if usedToday >= dailyLimit', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        plan: { dailyRequestLimit: 20 },
      });
      mockPrismaService.apiUsageLog.count.mockResolvedValue(20);

      let error: any;
      try {
        await service.assertWithinLimit('user-1');
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toBe('Daily request limit reached');
    });
  });
});
