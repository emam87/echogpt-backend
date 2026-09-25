import { Test, TestingModule } from '@nestjs/testing';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

describe('UsageController', () => {
  let controller: UsageController;
  let service: UsageService;

  const mockUsageService = {
    getUsageInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [{ provide: UsageService, useValue: mockUsageService }],
    }).compile();

    controller = module.get<UsageController>(UsageController);
    service = module.get<UsageService>(UsageService);
    jest.clearAllMocks();
  });

  it('getRemaining should delegate to service.getUsageInfo', async () => {
    const usageObj = {
      dailyLimit: 20,
      usedToday: 5,
      remaining: 15,
      resetsAt: new Date(),
    };
    mockUsageService.getUsageInfo.mockResolvedValue(usageObj);

    const result = await controller.getRemaining('u1');

    expect(service.getUsageInfo).toHaveBeenCalledWith('u1');
    expect(result).toBe(usageObj);
  });
});
