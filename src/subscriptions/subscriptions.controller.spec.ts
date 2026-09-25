import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: SubscriptionsService;

  const mockSubscriptionsService = {
    getStatus: jest.fn(),
    upgrade: jest.fn(),
    downgrade: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  it('getStatus should delegate to service.getStatus', async () => {
    const statusObj = { planName: 'FREE', dailyRequestLimit: 20 };
    mockSubscriptionsService.getStatus.mockResolvedValue(statusObj);

    const result = await controller.getStatus('u1');

    expect(service.getStatus).toHaveBeenCalledWith('u1');
    expect(result).toBe(statusObj);
  });

  it('upgrade should delegate to service.upgrade', async () => {
    const upgradedObj = { planName: 'PREMIUM', dailyRequestLimit: 500 };
    mockSubscriptionsService.upgrade.mockResolvedValue(upgradedObj);

    const result = await controller.upgrade('u1');

    expect(service.upgrade).toHaveBeenCalledWith('u1');
    expect(result).toBe(upgradedObj);
  });

  it('downgrade should delegate to service.downgrade', async () => {
    const downgradedObj = { planName: 'FREE', dailyRequestLimit: 20 };
    mockSubscriptionsService.downgrade.mockResolvedValue(downgradedObj);

    const result = await controller.downgrade('u1');

    expect(service.downgrade).toHaveBeenCalledWith('u1');
    expect(result).toBe(downgradedObj);
  });
});
