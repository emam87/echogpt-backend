import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MessageRole, ProviderType } from '@prisma/client';
import { CryptoService } from '../common/crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { ChatService } from './chat.service';
import { AiProviderFactory } from './factories/ai-provider.factory';

describe('ChatService', () => {
  let service: ChatService;
  let mockPrismaService: any;
  let mockCryptoService: any;
  let mockUsageService: any;
  let mockAiProviderFactory: any;
  let mockAdapter: any;

  const userId = 'user-1';
  const mockProvider = {
    id: 'prov-1',
    userId: 'user-1',
    type: ProviderType.OPENAI,
    name: 'OpenAI GPT-4o',
    model: 'gpt-4o',
    encryptedApiKey: 'encrypted_sk-key123',
    isEnabled: true,
    isDefault: true,
  };

  const mockConversation = {
    id: 'conv-1',
    userId: 'user-1',
    providerId: 'prov-1',
    title: 'Hello world prompt',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      aiProvider: {
        findFirst: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      apiUsageLog: {
        create: jest.fn(),
      },
    };

    mockCryptoService = {
      decrypt: jest.fn((text: string) => text.replace('encrypted_', '')),
    };

    mockUsageService = {
      assertWithinLimit: jest.fn(),
    };

    mockAdapter = {
      chat: jest.fn(),
    };

    mockAiProviderFactory = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: UsageService, useValue: mockUsageService },
        { provide: AiProviderFactory, useValue: mockAiProviderFactory },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should throw HttpException(429) if daily request limit is reached', async () => {
      mockUsageService.assertWithinLimit.mockRejectedValue(
        new HttpException('Daily request limit reached', HttpStatus.TOO_MANY_REQUESTS),
      );

      await expect(
        service.sendMessage(userId, { message: 'Hello' }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException if no provider is configured', async () => {
      mockUsageService.assertWithinLimit.mockResolvedValue(undefined);
      mockPrismaService.aiProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage(userId, { message: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create new conversation, call adapter, save messages and return reply', async () => {
      mockUsageService.assertWithinLimit.mockResolvedValue(undefined);
      mockPrismaService.aiProvider.findFirst.mockResolvedValue(mockProvider);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue({});
      mockPrismaService.apiUsageLog.create.mockResolvedValue({});
      mockAdapter.chat.mockResolvedValue({
        content: 'AI Assistant response',
        tokensUsed: 25,
      });

      const result = await service.sendMessage(userId, {
        message: 'Hello world prompt',
      });

      expect(mockUsageService.assertWithinLimit).toHaveBeenCalledWith(userId);
      expect(mockPrismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          userId,
          providerId: 'prov-1',
          title: 'Hello world prompt',
        },
      });
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          role: MessageRole.USER,
          content: 'Hello world prompt',
        },
      });
      expect(mockAdapter.chat).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello world prompt' }],
        'sk-key123',
        'gpt-4o',
      );
      expect(mockPrismaService.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          role: MessageRole.ASSISTANT,
          content: 'AI Assistant response',
          tokens: 25,
        },
      });
      expect(mockPrismaService.apiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          providerId: 'prov-1',
          endpoint: '/api/v1/chat',
          statusCode: 200,
          tokensUsed: 25,
        }),
      });
      expect(result).toEqual({
        conversationId: 'conv-1',
        reply: 'AI Assistant response',
        tokensUsed: 25,
      });
    });

    it('should append user message to existing conversation history', async () => {
      mockUsageService.assertWithinLimit.mockResolvedValue(undefined);
      mockPrismaService.aiProvider.findFirst.mockResolvedValue(mockProvider);
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.message.findMany.mockResolvedValue([
        { role: MessageRole.USER, content: 'First message' },
        { role: MessageRole.ASSISTANT, content: 'First response' },
      ]);
      mockPrismaService.message.create.mockResolvedValue({});
      mockPrismaService.apiUsageLog.create.mockResolvedValue({});
      mockAdapter.chat.mockResolvedValue({
        content: 'Second response',
        tokensUsed: 30,
      });

      const result = await service.sendMessage(userId, {
        conversationId: 'conv-1',
        message: 'Second message',
      });

      expect(mockAdapter.chat).toHaveBeenCalledWith(
        [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Second message' },
        ],
        'sk-key123',
        'gpt-4o',
      );
      expect(result.reply).toBe('Second response');
    });

    it('should log usage error row and throw BadGatewayException on provider failure', async () => {
      mockUsageService.assertWithinLimit.mockResolvedValue(undefined);
      mockPrismaService.aiProvider.findFirst.mockResolvedValue(mockProvider);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);
      mockPrismaService.message.create.mockResolvedValue({});
      mockPrismaService.apiUsageLog.create.mockResolvedValue({});
      mockAdapter.chat.mockRejectedValue(new Error('API failed'));

      await expect(
        service.sendMessage(userId, { message: 'Hello' }),
      ).rejects.toThrow(BadGatewayException);

      expect(mockPrismaService.apiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          providerId: 'prov-1',
          endpoint: '/api/v1/chat',
          statusCode: 502,
          tokensUsed: 0,
        }),
      });
    });
  });

  describe('getConversations', () => {
    it('should return paginated conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([mockConversation]);
      mockPrismaService.conversation.count.mockResolvedValue(1);

      const result = await service.getConversations(userId, 1, 20);

      expect(result).toEqual({
        data: [mockConversation],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('getMessages', () => {
    it('should return messages for owned conversation', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      const messages = [{ id: 'm1', content: 'Hi' }];
      mockPrismaService.message.findMany.mockResolvedValue(messages);

      const result = await service.getMessages(userId, 'conv-1');

      expect(result).toBe(messages);
    });

    it('should throw NotFoundException if conversation not found or not owned', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(service.getMessages(userId, 'other-conv')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation if owned by user', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      mockPrismaService.conversation.delete.mockResolvedValue(mockConversation);

      await service.deleteConversation(userId, 'conv-1');

      expect(mockPrismaService.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      });
    });

    it('should throw NotFoundException if conversation not found or not owned', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteConversation(userId, 'other-conv'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
