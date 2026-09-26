import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiProvider, Conversation, Message, MessageRole } from '@prisma/client';
import { CryptoService } from '../common/crypto/crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { ChatReplyDto, SendMessageDto } from './dto';
import { AiProviderFactory } from './factories/ai-provider.factory';
import { ChatMessage } from './interfaces/ai-provider.interface';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly usageService: UsageService,
    private readonly aiProviderFactory: AiProviderFactory,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto): Promise<ChatReplyDto> {
    await this.usageService.assertWithinLimit(userId);

    let provider: AiProvider | null = null;

    if (dto.providerId) {
      provider = await this.prisma.aiProvider.findFirst({
        where: {
          id: dto.providerId,
          isEnabled: true,
          OR: [{ userId }, { userId: null }],
        },
      });
      if (!provider) {
        throw new NotFoundException('AI Provider not found or disabled');
      }
    } else {
      provider = await this.prisma.aiProvider.findFirst({
        where: { userId, isDefault: true, isEnabled: true },
      });
      if (!provider) {
        provider = await this.prisma.aiProvider.findFirst({
          where: { userId: null, isDefault: true, isEnabled: true },
        });
      }
      if (!provider) {
        provider = await this.prisma.aiProvider.findFirst({
          where: {
            isEnabled: true,
            OR: [{ userId }, { userId: null }],
          },
        });
      }
      if (!provider) {
        throw new NotFoundException('No provider configured');
      }
    }

    const rawApiKey = this.cryptoService.decrypt(provider.encryptedApiKey);
    if (!rawApiKey) {
      throw new BadGatewayException('Invalid provider configuration');
    }

    let conversation: Conversation;
    let existingMessages: Message[] = [];

    if (dto.conversationId) {
      const found = await this.prisma.conversation.findFirst({
        where: { id: dto.conversationId, userId },
      });
      if (!found) {
        throw new NotFoundException('Conversation not found');
      }
      conversation = found;
      existingMessages = await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      const title = dto.message.trim().slice(0, 40) || 'New Conversation';
      conversation = await this.prisma.conversation.create({
        data: {
          userId,
          providerId: provider.id,
          title,
        },
      });
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: dto.message,
      },
    });

    const promptMessages: ChatMessage[] = [
      ...existingMessages.map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
      })),
      { role: 'user', content: dto.message },
    ];

    const adapter = this.aiProviderFactory.getAdapter(provider.type);
    const startTime = Date.now();
    const isMock = process.env.MOCK_AI_RESPONSE === 'true';

    try {
      const chatResponse = isMock
        ? { content: 'This is a mock response from EchoGPT AI', tokensUsed: 10 }
        : await adapter.chat(
            promptMessages,
            rawApiKey,
            provider.model,
          );
      const latencyMs = Date.now() - startTime;
      const tokensUsed = chatResponse.tokensUsed ?? 0;

      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: chatResponse.content,
          tokens: tokensUsed,
        },
      });

      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          providerId: provider.id,
          endpoint: '/api/v1/chat',
          method: 'POST',
          statusCode: 200,
          tokensUsed,
          latencyMs,
        },
      });

      return {
        conversationId: conversation.id,
        reply: chatResponse.content,
        tokensUsed,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const statusCode = error.statusCode || error.status || 502;

      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          providerId: provider.id,
          endpoint: '/api/v1/chat',
          method: 'POST',
          statusCode,
          tokensUsed: 0,
          latencyMs,
        },
      });

      if (statusCode === 504 || statusCode === 408) {
        throw new GatewayTimeoutException('AI Provider gateway timed out');
      }
      throw new BadGatewayException('Failed to communicate with AI provider');
    }
  }

  async getConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({
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

  async getMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }
}
