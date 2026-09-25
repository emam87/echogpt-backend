import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SubStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsageInfo(userId: string) {
    const now = new Date();
    const startOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const nextUTCMidnight = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );

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

    const dailyLimit = activeSub?.plan?.dailyRequestLimit ?? 20;

    const usedToday = await this.prisma.apiUsageLog.count({
      where: {
        userId,
        createdAt: {
          gte: startOfTodayUTC,
          lt: nextUTCMidnight,
        },
        statusCode: {
          lt: 400,
        },
        OR: [
          { endpoint: { startsWith: '/api/v1/chat' } },
          { endpoint: { startsWith: '/api/v1/search' } },
        ],
      },
    });

    const remaining = Math.max(0, dailyLimit - usedToday);

    return {
      dailyLimit,
      usedToday,
      remaining,
      resetsAt: nextUTCMidnight,
    };
  }

  async assertWithinLimit(userId: string): Promise<void> {
    const { dailyLimit, usedToday } = await this.getUsageInfo(userId);

    if (usedToday >= dailyLimit) {
      throw new HttpException(
        'Daily request limit reached',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
