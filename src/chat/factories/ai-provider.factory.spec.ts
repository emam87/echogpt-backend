import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProviderType } from '@prisma/client';
import { ClaudeAdapter } from '../adapters/claude.adapter';
import { GeminiAdapter } from '../adapters/gemini.adapter';
import { OpenAiAdapter } from '../adapters/openai.adapter';
import { AiProviderFactory } from './ai-provider.factory';

describe('AiProviderFactory', () => {
  let factory: AiProviderFactory;
  let openAiAdapter: OpenAiAdapter;
  let claudeAdapter: ClaudeAdapter;
  let geminiAdapter: GeminiAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiProviderFactory,
        { provide: OpenAiAdapter, useValue: {} },
        { provide: ClaudeAdapter, useValue: {} },
        { provide: GeminiAdapter, useValue: {} },
      ],
    }).compile();

    factory = module.get<AiProviderFactory>(AiProviderFactory);
    openAiAdapter = module.get<OpenAiAdapter>(OpenAiAdapter);
    claudeAdapter = module.get<ClaudeAdapter>(ClaudeAdapter);
    geminiAdapter = module.get<GeminiAdapter>(GeminiAdapter);
  });

  it('should return OpenAiAdapter for OPENAI', () => {
    const adapter = factory.getAdapter(ProviderType.OPENAI);
    expect(adapter).toBe(openAiAdapter);
  });

  it('should return ClaudeAdapter for CLAUDE', () => {
    const adapter = factory.getAdapter(ProviderType.CLAUDE);
    expect(adapter).toBe(claudeAdapter);
  });

  it('should return GeminiAdapter for GEMINI', () => {
    const adapter = factory.getAdapter(ProviderType.GEMINI);
    expect(adapter).toBe(geminiAdapter);
  });

  it('should throw BadRequestException for unknown provider type', () => {
    expect(() => factory.getAdapter('UNKNOWN' as any)).toThrow(
      BadRequestException,
    );
  });
});
