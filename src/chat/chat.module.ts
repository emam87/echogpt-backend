import { Module } from '@nestjs/common';
import { ClaudeAdapter, GeminiAdapter, OpenAiAdapter } from './adapters';
import { AiProviderFactory } from './factories/ai-provider.factory';

@Module({
  providers: [
    OpenAiAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    AiProviderFactory,
  ],
  exports: [
    OpenAiAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    AiProviderFactory,
  ],
})
export class ChatModule {}
