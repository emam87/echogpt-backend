import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanName, SubStatus } from '@prisma/client';
import { CryptoService } from '../common/crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { maskApiKey } from '../providers/utils/mask-api-key.util';
import { UpdateUserRoleDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async getStats() {
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

    const [
      totalUsers,
      totalConversations,
      totalMessages,
      totalSearches,
      activeSubs,
      requestsToday,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.webSearch.count(),
      this.prisma.subscription.findMany({
        where: { status: SubStatus.ACTIVE },
        include: { plan: true },
      }),
      this.prisma.apiUsageLog.count({
        where: { createdAt: { gte: startOfTodayUTC } },
      }),
    ]);

    let freeCount = 0;
    let premiumCount = 0;
    for (const sub of activeSubs) {
      if (sub.plan?.name === PlanName.PREMIUM) {
        premiumCount++;
      } else {
        freeCount++;
      }
    }

    return {
      totalUsers,
      totalConversations,
      totalMessages,
      totalSearches,
      activeSubscriptions: {
        free: freeCount,
        premium: premiumCount,
      },
      requestsToday,
    };
  }

  async getHealth() {
    let dbStatus = 'connected';
    let status = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
      status = 'degraded';
    }

    return {
      status,
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          role: true,
          subscriptions: {
            where: { status: SubStatus.ACTIVE },
            include: { plan: true },
            take: 1,
            orderBy: { startedAt: 'desc' },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role.name,
      currentPlan: u.subscriptions[0]?.plan?.name || PlanName.FREE,
      createdAt: u.createdAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role.name,
      createdAt: updated.createdAt,
    };
  }

  async getSubscriptions(page = 1, limit = 20, status?: SubStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [subs, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { email: true } },
          plan: { select: { name: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const data = subs.map((s) => ({
      id: s.id,
      userId: s.userId,
      userEmail: s.user.email,
      planName: s.plan.name,
      status: s.status,
      startedAt: s.startedAt,
      endsAt: s.endsAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProviders(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      this.prisma.aiProvider.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { email: true } },
        },
      }),
      this.prisma.aiProvider.count(),
    ]);

    const data = providers.map((p) => {
      let rawKey = '';
      try {
        rawKey = this.cryptoService.decrypt(p.encryptedApiKey);
      } catch {
        rawKey = '';
      }
      const { encryptedApiKey: _enc, user, ...rest } = p;
      return {
        ...rest,
        ownerEmail: user?.email || 'system',
        apiKey: maskApiKey(rawKey),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAnalytics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(now.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [logs, endpointGroups] = await Promise.all([
      this.prisma.apiUsageLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      this.prisma.apiUsageLog.groupBy({
        by: ['endpoint'],
        _count: { _all: true },
      }),
    ]);

    const dayMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dayMap.set(dateStr, 0);
    }

    for (const log of logs) {
      const dateStr = log.createdAt.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.set(dateStr, dayMap.get(dateStr)! + 1);
      }
    }

    const requestsPerDay = Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    const requestsPerEndpoint = endpointGroups.map((g) => ({
      endpoint: g.endpoint,
      count: g._count._all,
    }));

    return {
      requestsPerDay,
      requestsPerEndpoint,
    };
  }

  async getLogs(
    page = 1,
    limit = 20,
    userId?: string,
    statusCode?: number,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (statusCode !== undefined) {
      where.statusCode = statusCode;
    }

    const [data, total] = await Promise.all([
      this.prisma.apiUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiUsageLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
