import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { MockSearchProvider } from './providers/mock-search.provider';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrismaService: any;
  let mockUsageService: any;
  let mockSearchProvider: any;

  const userId = 'user-1';

  beforeEach(async () => {
    mockPrismaService = {
      webSearch: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      apiUsageLog: {
        create: jest.fn(),
      },
    };

    mockUsageService = {
      assertWithinLimit: jest.fn(),
    };

    mockSearchProvider = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsageService, useValue: mockUsageService },
        { provide: MockSearchProvider, useValue: mockSearchProvider },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should throw HttpException(429) if usage limit exceeded', async () => {
      mockUsageService.assertWithinLimit.mockRejectedValue(
        new HttpException('Daily request limit reached', HttpStatus.TOO_MANY_REQUESTS),
      );

      await expect(
        service.search(userId, { query: 'NestJS' }),
      ).rejects.toThrow(HttpException);
    });

    it('should return cached result immediately if cached entry exists', async () => {
      mockUsageService.assertWithinLimit.mockResolvedValue(undefined);
      const cachedItem = {
        query: 'NestJS',
        resultJson: [{ title: 'Cached NestJS', url: 'https://ex.com', snippet: '...' }],
        cachedUntil: new Date(Date.now() + 100000),
      };
      mockPrismaService.webSearch.findFirst.mockResolvedValue(cachedItem);

      const result = await service.search(userId, { query: 'NestJS' });

      expect(mockSearchProvider.search).not.toHaveBeenCalled();
      expect(result).toEqual({
        query: 'NestJS',
        results: cachedItem.resultJson,
        cached: true,
      });
    });

    it('should call search provider, save to DB with 1h cache, log usage, and return results if not cached', async () => {
      mockUsageService.assertWithinLimit.mockResolvedValue(undefined);
      mockPrismaService.webSearch.findFirst.mockResolvedValue(null);
      const mockResults = [{ title: 'Res 1', url: 'https://ex.com', snippet: '...' }];
      mockSearchProvider.search.mockResolvedValue(mockResults);
      mockPrismaService.webSearch.create.mockResolvedValue({});
      mockPrismaService.apiUsageLog.create.mockResolvedValue({});

      const result = await service.search(userId, { query: 'NestJS' });

      expect(mockSearchProvider.search).toHaveBeenCalledWith('NestJS');
      expect(mockPrismaService.webSearch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          query: 'NestJS',
          resultJson: mockResults,
          cachedUntil: expect.any(Date),
        }),
      });
      expect(mockPrismaService.apiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          endpoint: '/api/v1/search',
          statusCode: 200,
        }),
      });
      expect(result).toEqual({
        query: 'NestJS',
        results: mockResults,
        cached: false,
      });
    });
  });

  describe('getHistory', () => {
    it('should return paginated search history', async () => {
      const historyItem = { id: 's1', query: 'NestJS', createdAt: new Date() };
      mockPrismaService.webSearch.findMany.mockResolvedValue([historyItem]);
      mockPrismaService.webSearch.count.mockResolvedValue(1);

      const result = await service.getHistory(userId, 1, 20);

      expect(result).toEqual({
        data: [historyItem],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('getRecent', () => {
    it('should return last 5 distinct query strings', async () => {
      mockPrismaService.webSearch.findMany.mockResolvedValue([
        { query: 'query1' },
        { query: 'query2' },
      ]);

      const result = await service.getRecent(userId);

      expect(mockPrismaService.webSearch.findMany).toHaveBeenCalledWith({
        where: { userId },
        distinct: ['query'],
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { query: true },
      });
      expect(result).toEqual(['query1', 'query2']);
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for empty query', async () => {
      const result = await service.getSuggestions(userId, '');
      expect(result).toEqual([]);
    });

    it('should return up to 5 matching past queries', async () => {
      mockPrismaService.webSearch.findMany.mockResolvedValue([
        { query: 'NestJS docs' },
        { query: 'NestJS tutorial' },
      ]);

      const result = await service.getSuggestions(userId, 'nest');

      expect(mockPrismaService.webSearch.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          query: {
            contains: 'nest',
            mode: 'insensitive',
          },
        },
        distinct: ['query'],
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { query: true },
      });
      expect(result).toEqual(['NestJS docs', 'NestJS tutorial']);
    });
  });
});
