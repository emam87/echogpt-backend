import { Injectable } from '@nestjs/common';
import {
  AiProviderAdapter,
  ChatMessage,
  ChatResponse,
} from '../interfaces/ai-provider.interface';
import { ProviderApiException } from './provider-api.exception';

@Injectable()
export class GeminiAdapter implements AiProviderAdapter {
  async chat(
    messages: ChatMessage[],
    apiKey: string,
    model: string,
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'EchoGPT-Backend',
        },
        body: JSON.stringify({ contents }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderApiException(
          `Gemini API error: ${response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();
      const content =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

      return { content, tokensUsed };
    } catch (error: any) {
      if (error instanceof ProviderApiException) {
        throw error;
      }
      throw new ProviderApiException(
        error.message || 'Failed to communicate with Gemini API',
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
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
