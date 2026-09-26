import { BadRequestException, Injectable } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { ClaudeAdapter } from '../adapters/claude.adapter';
import { GeminiAdapter } from '../adapters/gemini.adapter';
import { OpenAiAdapter } from '../adapters/openai.adapter';
import { AiProviderAdapter } from '../interfaces/ai-provider.interface';

@Injectable()
export class AiProviderFactory {
  private readonly adapters: Map<string, AiProviderAdapter>;

  constructor(
    openAiAdapter: OpenAiAdapter,
    claudeAdapter: ClaudeAdapter,
    geminiAdapter: GeminiAdapter,
  ) {
    this.adapters = new Map<string, AiProviderAdapter>([
      [ProviderType.OPENAI, openAiAdapter],
      [ProviderType.CLAUDE, claudeAdapter],
      [ProviderType.GEMINI, geminiAdapter],
    ]);
  }

  getAdapter(
    type: ProviderType | 'OPENAI' | 'CLAUDE' | 'GEMINI',
  ): AiProviderAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new BadRequestException(`Unsupported AI provider type: ${type}`);
    }
    return adapter;
  }
}
