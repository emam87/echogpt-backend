import { Injectable } from '@nestjs/common';
import {
  AiProviderAdapter,
  ChatMessage,
  ChatResponse,
} from '../interfaces/ai-provider.interface';
import { ProviderApiException } from './provider-api.exception';

@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  async chat(
    messages: ChatMessage[],
    apiKey: string,
    model: string,
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'EchoGPT-Backend',
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderApiException(
          `OpenAI API error: ${response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || 0;

      return { content, tokensUsed };
    } catch (error: any) {
      if (error instanceof ProviderApiException) {
        throw error;
      }
      throw new ProviderApiException(
        error.message || 'Failed to communicate with OpenAI API',
        502,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck(apiKey: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'EchoGPT-Backend-HealthCheck',
        },
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
