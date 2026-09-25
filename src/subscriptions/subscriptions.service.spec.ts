import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlanName, SubStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prismaService: any;

  const mockPrismaService = {
    subscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prismaService = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return active subscription status', async () => {
      const mockActiveSub = {
        id: 'sub-1',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        startedAt: new Date(),
        endsAt: null,
        plan: {
          name: PlanName.FREE,
          dailyRequestLimit: 20,
        },
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(mockActiveSub);

      const result = await service.getStatus('u1');

      expect(result).toEqual({
        planName: PlanName.FREE,
        dailyRequestLimit: 20,
        status: SubStatus.ACTIVE,
        startedAt: mockActiveSub.startedAt,
        endsAt: null,
      });
    });

    it('should throw NotFoundException if no active subscription exists', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      await expect(service.getStatus('u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upgrade', () => {
    it('should upgrade FREE user to PREMIUM in transaction', async () => {
      const activeSub = {
        id: 'sub-free',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        plan: { name: PlanName.FREE },
      };

      const premiumPlan = {
        id: 2,
        name: PlanName.PREMIUM,
        dailyRequestLimit: 500,
      };

      const createdSub = {
        id: 'sub-premium',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        startedAt: new Date(),
        endsAt: null,
        plan: premiumPlan,
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(activeSub);
      mockPrismaService.plan.findUnique.mockResolvedValue(premiumPlan);
      mockPrismaService.subscription.update.mockResolvedValue({});
      mockPrismaService.subscription.create.mockResolvedValue(createdSub);

      const result = await service.upgrade('u1');

      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: activeSub.id },
        data: {
          status: SubStatus.CANCELED,
          endsAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        planName: PlanName.PREMIUM,
        dailyRequestLimit: 500,
        status: SubStatus.ACTIVE,
        startedAt: createdSub.startedAt,
        endsAt: null,
      });
    });

    it('should throw ConflictException if user is already on PREMIUM plan', async () => {
      const activeSub = {
        id: 'sub-premium',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        plan: { name: PlanName.PREMIUM },
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(activeSub);

      await expect(service.upgrade('u1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('downgrade', () => {
    it('should downgrade PREMIUM user to FREE in transaction', async () => {
      const activeSub = {
        id: 'sub-premium',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        plan: { name: PlanName.PREMIUM },
      };

      const freePlan = {
        id: 1,
        name: PlanName.FREE,
        dailyRequestLimit: 20,
      };

      const createdSub = {
        id: 'sub-free',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        startedAt: new Date(),
        endsAt: null,
        plan: freePlan,
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(activeSub);
      mockPrismaService.plan.findUnique.mockResolvedValue(freePlan);
      mockPrismaService.subscription.update.mockResolvedValue({});
      mockPrismaService.subscription.create.mockResolvedValue(createdSub);

      const result = await service.downgrade('u1');

      expect(prismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: activeSub.id },
        data: {
          status: SubStatus.CANCELED,
          endsAt: expect.any(Date),
        },
      });

      expect(result).toEqual({
        planName: PlanName.FREE,
        dailyRequestLimit: 20,
        status: SubStatus.ACTIVE,
        startedAt: createdSub.startedAt,
        endsAt: null,
      });
    });

    it('should throw ConflictException if user is already on FREE plan', async () => {
      const activeSub = {
        id: 'sub-free',
        userId: 'u1',
        status: SubStatus.ACTIVE,
        plan: { name: PlanName.FREE },
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(activeSub);

      await expect(service.downgrade('u1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
