export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | string;
  content: string;
}

export interface ChatResponse {
  content: string;
  tokensUsed?: number;
}

export interface AiProviderAdapter {
  chat(
    messages: ChatMessage[],
    apiKey: string,
    model: string,
  ): Promise<ChatResponse>;
  healthCheck(apiKey: string): Promise<boolean>;
}
