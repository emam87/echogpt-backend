import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PlanName, SubStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
      include: {
        plan: true,
      },
    });

    if (!activeSub) {
      throw new NotFoundException('Active subscription not found');
    }

    return {
      planName: activeSub.plan.name,
      dailyRequestLimit: activeSub.plan.dailyRequestLimit,
      status: activeSub.status,
      startedAt: activeSub.startedAt,
      endsAt: activeSub.endsAt,
    };
  }

  /**
   * Upgrades user from FREE to PREMIUM plan.
   * NOTE: Payment processing is mocked for demonstration purposes.
   */
  async upgrade(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: {
          userId,
          status: SubStatus.ACTIVE,
        },
        orderBy: { startedAt: 'desc' },
        include: {
          plan: true,
        },
      });

      if (!activeSub) {
        throw new NotFoundException('Active subscription not found');
      }

      if (activeSub.plan.name === PlanName.PREMIUM) {
        throw new ConflictException('User is already on PREMIUM plan');
      }

      let premiumPlan = await tx.plan.findUnique({
        where: { name: PlanName.PREMIUM },
      });

      if (!premiumPlan) {
        premiumPlan = await tx.plan.create({
          data: {
            name: PlanName.PREMIUM,
            dailyRequestLimit: 500,
            price: 10,
          },
        });
      }

      const now = new Date();

      await tx.subscription.update({
        where: { id: activeSub.id },
        data: {
          status: SubStatus.CANCELED,
          endsAt: now,
        },
      });

      const newSub = await tx.subscription.create({
        data: {
          userId,
          planId: premiumPlan.id,
          status: SubStatus.ACTIVE,
          startedAt: now,
        },
        include: {
          plan: true,
        },
      });

      return {
        planName: newSub.plan.name,
        dailyRequestLimit: newSub.plan.dailyRequestLimit,
        status: newSub.status,
        startedAt: newSub.startedAt,
        endsAt: newSub.endsAt,
      };
    });
  }

  /**
   * Downgrades user from PREMIUM to FREE plan.
   * NOTE: Payment/Billing changes are mocked for demonstration purposes.
   */
  async downgrade(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const activeSub = await tx.subscription.findFirst({
        where: {
          userId,
          status: SubStatus.ACTIVE,
        },
        orderBy: { startedAt: 'desc' },
        include: {
          plan: true,
        },
      });

      if (!activeSub) {
        throw new NotFoundException('Active subscription not found');
      }

      if (activeSub.plan.name === PlanName.FREE) {
        throw new ConflictException('User is already on FREE plan');
      }

      let freePlan = await tx.plan.findUnique({
        where: { name: PlanName.FREE },
      });

      if (!freePlan) {
        freePlan = await tx.plan.create({
          data: {
            name: PlanName.FREE,
            dailyRequestLimit: 20,
            price: 0,
          },
        });
      }

      const now = new Date();

      await tx.subscription.update({
        where: { id: activeSub.id },
        data: {
          status: SubStatus.CANCELED,
          endsAt: now,
        },
      });

      const newSub = await tx.subscription.create({
        data: {
          userId,
          planId: freePlan.id,
          status: SubStatus.ACTIVE,
          startedAt: now,
        },
        include: {
          plan: true,
        },
      });

      return {
        planName: newSub.plan.name,
        dailyRequestLimit: newSub.plan.dailyRequestLimit,
        status: newSub.status,
        startedAt: newSub.startedAt,
        endsAt: newSub.endsAt,
      };
    });
  }
}


