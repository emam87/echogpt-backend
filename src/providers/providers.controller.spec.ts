import { Test, TestingModule } from '@nestjs/testing';
import { ProviderType } from '@prisma/client';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

describe('ProvidersController', () => {
  let controller: ProvidersController;
  let service: ProvidersService;

  const user = { id: 'u1', role: { name: 'USER' } };

  const mockProvidersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggle: jest.fn(),
    setDefault: jest.fn(),
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [
        { provide: ProvidersService, useValue: mockProvidersService },
      ],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    service = module.get<ProvidersService>(ProvidersService);
    jest.clearAllMocks();
  });

  it('create should delegate to service.create', async () => {
    const dto = {
      type: ProviderType.OPENAI,
      name: 'OpenAI',
      model: 'gpt-4o',
      apiKey: 'sk-1234567890abcd',
    };
    const expected = { id: 'p1', ...dto, apiKey: 'sk-****abcd' };
    mockProvidersService.create.mockResolvedValue(expected);

    const result = await controller.create(user, dto);

    expect(service.create).toHaveBeenCalledWith(user, dto);
    expect(result).toBe(expected);
  });

  it('findAll should delegate to service.findAll', async () => {
    const expected = [{ id: 'p1', name: 'OpenAI' }];
    mockProvidersService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll(user);

    expect(service.findAll).toHaveBeenCalledWith(user);
    expect(result).toBe(expected);
  });

  it('update should delegate to service.update', async () => {
    const dto = { name: 'Updated OpenAI' };
    const expected = { id: 'p1', name: 'Updated OpenAI' };
    mockProvidersService.update.mockResolvedValue(expected);

    const result = await controller.update(user, 'p1', dto);

    expect(service.update).toHaveBeenCalledWith(user, 'p1', dto);
    expect(result).toBe(expected);
  });

  it('remove should delegate to service.remove', async () => {
    mockProvidersService.remove.mockResolvedValue(undefined);

    await controller.remove(user, 'p1');

    expect(service.remove).toHaveBeenCalledWith(user, 'p1');
  });

  it('toggle should delegate to service.toggle', async () => {
    const expected = { id: 'p1', isEnabled: false };
    mockProvidersService.toggle.mockResolvedValue(expected);

    const result = await controller.toggle(user, 'p1');

    expect(service.toggle).toHaveBeenCalledWith(user, 'p1');
    expect(result).toBe(expected);
  });

  it('setDefault should delegate to service.setDefault', async () => {
    const expected = { id: 'p1', isDefault: true };
    mockProvidersService.setDefault.mockResolvedValue(expected);

    const result = await controller.setDefault(user, 'p1');

    expect(service.setDefault).toHaveBeenCalledWith(user, 'p1');
    expect(result).toBe(expected);
  });

  it('checkHealth should delegate to service.checkHealth', async () => {
    const expected = { healthy: true, checkedAt: '2026-09-26T12:00:00.000Z' };
    mockProvidersService.checkHealth.mockResolvedValue(expected);

    const result = await controller.checkHealth(user, 'p1');

    expect(service.checkHealth).toHaveBeenCalledWith(user, 'p1');
    expect(result).toBe(expected);
  });
});
