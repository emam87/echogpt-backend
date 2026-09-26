import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  const userId = 'u1';
  const mockSearchService = {
    search: jest.fn(),
    getHistory: jest.fn(),
    getRecent: jest.fn(),
    getSuggestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockSearchService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  it('search should delegate to service.search', async () => {
    const dto = { query: 'NestJS' };
    const expected = { query: 'NestJS', results: [], cached: false };
    mockSearchService.search.mockResolvedValue(expected);

    const result = await controller.search(userId, dto);

    expect(service.search).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });

  it('getHistory should delegate to service.getHistory with default page and limit', async () => {
    const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    mockSearchService.getHistory.mockResolvedValue(expected);

    const result = await controller.getHistory(userId);

    expect(service.getHistory).toHaveBeenCalledWith(userId, 1, 20);
    expect(result).toBe(expected);
  });

  it('getRecent should delegate to service.getRecent', async () => {
    const expected = ['q1', 'q2'];
    mockSearchService.getRecent.mockResolvedValue(expected);

    const result = await controller.getRecent(userId);

    expect(service.getRecent).toHaveBeenCalledWith(userId);
    expect(result).toBe(expected);
  });

  it('getSuggestions should delegate to service.getSuggestions', async () => {
    const expected = ['q1'];
    mockSearchService.getSuggestions.mockResolvedValue(expected);

    const result = await controller.getSuggestions(userId, 'test');

    expect(service.getSuggestions).toHaveBeenCalledWith(userId, 'test');
    expect(result).toBe(expected);
  });
});
