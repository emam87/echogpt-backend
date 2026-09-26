import { Module } from '@nestjs/common';
import { CryptoModule } from '../common/crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageModule } from '../usage/usage.module';
import { ClaudeAdapter, GeminiAdapter, OpenAiAdapter } from './adapters';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiProviderFactory } from './factories/ai-provider.factory';

@Module({
  imports: [PrismaModule, CryptoModule, UsageModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    OpenAiAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    AiProviderFactory,
  ],
  exports: [
    ChatService,
    OpenAiAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    AiProviderFactory,
  ],
})
export class ChatModule {}
