import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProviderType } from '@prisma/client';
import { AiProviderFactory } from '../chat/factories/ai-provider.factory';
import { CryptoService } from '../common/crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from './providers.service';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let mockPrismaService: any;
  let mockCryptoService: any;
  let mockAiProviderFactory: any;
  let mockAdapter: any;

  const user = { id: 'user-1', role: { name: 'USER' } };
  const adminUser = { id: 'admin-1', role: { name: 'ADMIN' } };
  const otherUser = { id: 'user-2', role: { name: 'USER' } };

  const mockProvider = {
    id: 'prov-1',
    userId: 'user-1',
    type: ProviderType.OPENAI,
    name: 'OpenAI GPT-4o',
    model: 'gpt-4o',
    encryptedApiKey: 'encrypted_sk-1234567890abcd',
    isEnabled: true,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemProvider = {
    id: 'sys-prov-1',
    userId: null,
    type: ProviderType.CLAUDE,
    name: 'System Claude',
    model: 'claude-3-5-sonnet-20241022',
    encryptedApiKey: 'encrypted_sk-claude1234',
    isEnabled: true,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      aiProvider: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    mockCryptoService = {
      encrypt: jest.fn((text: string) => `encrypted_${text}`),
      decrypt: jest.fn((text: string) => text.replace('encrypted_', '')),
    };

    mockAdapter = {
      healthCheck: jest.fn(),
    };

    mockAiProviderFactory = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: AiProviderFactory, useValue: mockAiProviderFactory },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a provider for a regular user with masked apiKey returned', async () => {
      mockPrismaService.aiProvider.create.mockResolvedValue(mockProvider);

      const result = await service.create(user, {
        type: ProviderType.OPENAI,
        name: 'OpenAI GPT-4o',
        model: 'gpt-4o',
        apiKey: 'sk-1234567890abcd',
      });

      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('sk-1234567890abcd');
      expect(mockPrismaService.aiProvider.create).toHaveBeenCalledWith({
        data: {
          userId: user.id,
          type: ProviderType.OPENAI,
          name: 'OpenAI GPT-4o',
          model: 'gpt-4o',
          encryptedApiKey: 'encrypted_sk-1234567890abcd',
          isDefault: false,
          isEnabled: true,
        },
      });

      expect(result.apiKey).toBe('****abcd');
      expect(result).not.toHaveProperty('encryptedApiKey');
    });

    it('should allow admin to create a system provider (userId = null)', async () => {
      mockPrismaService.aiProvider.create.mockResolvedValue(mockSystemProvider);

      const result = await service.create(adminUser, {
        type: ProviderType.CLAUDE,
        name: 'System Claude',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-claude1234',
        isSystem: true,
      });

      expect(mockPrismaService.aiProvider.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          type: ProviderType.CLAUDE,
        }),
      });

      expect(result.apiKey).toBe('****1234');
    });

    it('should throw ForbiddenException if regular user attempts to create system provider', async () => {
      await expect(
        service.create(user, {
          type: ProviderType.OPENAI,
          name: 'System Provider Attempt',
          model: 'gpt-4o',
          apiKey: 'sk-1234567890abcd',
          isSystem: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should unset previous defaults in transaction if isDefault is true', async () => {
      mockPrismaService.aiProvider.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.aiProvider.create.mockResolvedValue({
        ...mockProvider,
        isDefault: true,
      });

      const result = await service.create(user, {
        type: ProviderType.OPENAI,
        name: 'OpenAI GPT-4o',
        model: 'gpt-4o',
        apiKey: 'sk-1234567890abcd',
        isDefault: true,
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.aiProvider.updateMany).toHaveBeenCalledWith({
        where: { userId: user.id },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return providers visible to current user (own + system ones) with masked keys', async () => {
      mockPrismaService.aiProvider.findMany.mockResolvedValue([
        mockProvider,
        mockSystemProvider,
      ]);

      const results = await service.findAll(user);

      expect(mockPrismaService.aiProvider.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ userId: user.id }, { userId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(results).toHaveLength(2);
      expect(results[0].apiKey).toBe('****abcd');
      expect(results[1].apiKey).toBe('****1234');
    });
  });

  describe('update', () => {
    it('should update name/model/apiKey and re-encrypt if apiKey provided', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.aiProvider.update.mockResolvedValue({
        ...mockProvider,
        name: 'Updated Name',
        encryptedApiKey: 'encrypted_sk-newkey1234',
      });

      const result = await service.update(user, 'prov-1', {
        name: 'Updated Name',
        apiKey: 'sk-newkey1234',
      });

      expect(mockCryptoService.encrypt).toHaveBeenCalledWith('sk-newkey1234');
      expect(mockPrismaService.aiProvider.update).toHaveBeenCalledWith({
        where: { id: 'prov-1' },
        data: {
          name: 'Updated Name',
          encryptedApiKey: 'encrypted_sk-newkey1234',
        },
      });
      expect(result.apiKey).toBe('****1234');
    });

    it('should throw NotFoundException if provider not found or owned by another user', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);

      await expect(
        service.update(otherUser, 'prov-1', { name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to update system provider', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockSystemProvider);
      mockPrismaService.aiProvider.update.mockResolvedValue({
        ...mockSystemProvider,
        name: 'Updated System Provider',
      });

      const result = await service.update(adminUser, 'sys-prov-1', {
        name: 'Updated System Provider',
      });

      expect(result.name).toBe('Updated System Provider');
    });
  });

  describe('remove', () => {
    it('should delete provider if owned by user', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.aiProvider.delete.mockResolvedValue(mockProvider);

      await service.remove(user, 'prov-1');

      expect(mockPrismaService.aiProvider.delete).toHaveBeenCalledWith({
        where: { id: 'prov-1' },
      });
    });

    it('should throw NotFoundException if not found or not owned', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(null);

      await expect(service.remove(user, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggle', () => {
    it('should flip isEnabled flag', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.aiProvider.update.mockResolvedValue({
        ...mockProvider,
        isEnabled: false,
      });

      const result = await service.toggle(user, 'prov-1');

      expect(mockPrismaService.aiProvider.update).toHaveBeenCalledWith({
        where: { id: 'prov-1' },
        data: { isEnabled: false },
      });
      expect(result.isEnabled).toBe(false);
    });
  });

  describe('setDefault', () => {
    it('should set provider as default and unset others in transaction', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockPrismaService.aiProvider.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.aiProvider.update.mockResolvedValue({
        ...mockProvider,
        isDefault: true,
      });

      const result = await service.setDefault(user, 'prov-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.aiProvider.updateMany).toHaveBeenCalledWith({
        where: { userId: user.id },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy: true if adapter.healthCheck succeeds', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockAdapter.healthCheck.mockResolvedValue(true);

      const result = await service.checkHealth(user, 'prov-1');

      expect(mockAiProviderFactory.getAdapter).toHaveBeenCalledWith(ProviderType.OPENAI);
      expect(mockAdapter.healthCheck).toHaveBeenCalledWith('sk-1234567890abcd');
      expect(result.healthy).toBe(true);
      expect(result.checkedAt).toBeDefined();
    });

    it('should return healthy: false if adapter.healthCheck returns false', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockAdapter.healthCheck.mockResolvedValue(false);

      const result = await service.checkHealth(user, 'prov-1');

      expect(result.healthy).toBe(false);
      expect(result.checkedAt).toBeDefined();
    });

    it('should return healthy: false if adapter.healthCheck throws error without crashing request', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);
      mockAdapter.healthCheck.mockRejectedValue(new Error('Network error'));

      const result = await service.checkHealth(user, 'prov-1');

      expect(result.healthy).toBe(false);
      expect(result.checkedAt).toBeDefined();
    });

    it('should allow user to check health of system provider (userId = null)', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockSystemProvider);
      mockAdapter.healthCheck.mockResolvedValue(true);

      const result = await service.checkHealth(user, 'sys-prov-1');

      expect(result.healthy).toBe(true);
    });

    it('should throw NotFoundException if user tries to check health of another user provider', async () => {
      mockPrismaService.aiProvider.findUnique.mockResolvedValue(mockProvider);

      await expect(service.checkHealth(otherUser, 'prov-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
