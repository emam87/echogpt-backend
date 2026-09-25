import { Injectable, NotFoundException } from '@nestjs/common';
import { SubStatus } from '@prisma/client';
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
}
