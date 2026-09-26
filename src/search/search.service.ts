import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { SearchRequestDto, SearchResponseDto } from './dto';
import { MockSearchProvider } from './providers/mock-search.provider';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
    private readonly mockSearchProvider: MockSearchProvider,
  ) {}

  async search(userId: string, dto: SearchRequestDto): Promise<SearchResponseDto> {
    await this.usageService.assertWithinLimit(userId);

    const now = new Date();
    const cachedEntry = await this.prisma.webSearch.findFirst({
      where: {
        query: { equals: dto.query, mode: 'insensitive' },
        cachedUntil: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cachedEntry) {
      return {
        query: cachedEntry.query,
        results: cachedEntry.resultJson as any,
        cached: true,
      };
    }

    const startTime = Date.now();
    const results = await this.mockSearchProvider.search(dto.query);
    const latencyMs = Date.now() - startTime;

    const cachedUntil = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.webSearch.create({
      data: {
        userId,
        query: dto.query,
        resultJson: results as any,
        cachedUntil,
      },
    });

    await this.prisma.apiUsageLog.create({
      data: {
        userId,
        endpoint: '/api/v1/search',
        method: 'POST',
        statusCode: 200,
        tokensUsed: 0,
        latencyMs,
      },
    });

    return {
      query: dto.query,
      results,
      cached: false,
    };
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.webSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          query: true,
          createdAt: true,
          cachedUntil: true,
        },
      }),
      this.prisma.webSearch.count({
        where: { userId },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecent(userId: string): Promise<string[]> {
    const searches = await this.prisma.webSearch.findMany({
      where: { userId },
      distinct: ['query'],
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        query: true,
      },
    });

    return searches.map((s) => s.query);
  }

  async getSuggestions(userId: string, partial: string): Promise<string[]> {
    if (!partial || partial.trim().length === 0) {
      return [];
    }

    const suggestions = await this.prisma.webSearch.findMany({
      where: {
        userId,
        query: {
          contains: partial.trim(),
          mode: 'insensitive',
        },
      },
      distinct: ['query'],
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        query: true,
      },
    });

    return suggestions.map((s) => s.query);
  }
}
