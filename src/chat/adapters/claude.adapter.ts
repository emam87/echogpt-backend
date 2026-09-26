import { Injectable } from '@nestjs/common';
import {
  AiProviderAdapter,
  ChatMessage,
  ChatResponse,
} from '../interfaces/ai-provider.interface';
import { ProviderApiException } from './provider-api.exception';

@Injectable()
export class ClaudeAdapter implements AiProviderAdapter {
  async chat(
    messages: ChatMessage[],
    apiKey: string,
    model: string,
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const systemMessages = messages.filter((m) => m.role === 'system');
      const nonSystemMessages = messages.filter((m) => m.role !== 'system');

      const systemPrompt = systemMessages.map((m) => m.content).join('\n');

      const formattedMessages = nonSystemMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const body: any = {
        model,
        max_tokens: 1024,
        messages: formattedMessages.length > 0
          ? formattedMessages
          : [{ role: 'user', content: '' }],
      };

      if (systemPrompt) {
        body.system = systemPrompt;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'User-Agent': 'EchoGPT-Backend',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[ClaudeAdapter] Error (${response.status} ${response.statusText}):`,
          errorText,
        );
        throw new ProviderApiException(
          `Claude API error (${response.status}): ${errorText}`,
          response.status,
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      const tokensUsed =
        (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

      return { content, tokensUsed };
    } catch (error: any) {
      if (error instanceof ProviderApiException) {
        throw error;
      }
      throw new ProviderApiException(
        error.message || 'Failed to communicate with Claude API',
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
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
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
