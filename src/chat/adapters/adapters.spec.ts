import { ClaudeAdapter } from './claude.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { OpenAiAdapter } from './openai.adapter';
import { ProviderApiException } from './provider-api.exception';

describe('AI Provider Adapters', () => {
  let openAiAdapter: OpenAiAdapter;
  let claudeAdapter: ClaudeAdapter;
  let geminiAdapter: GeminiAdapter;

  beforeEach(() => {
    openAiAdapter = new OpenAiAdapter();
    claudeAdapter = new ClaudeAdapter();
    geminiAdapter = new GeminiAdapter();
    jest.clearAllMocks();
  });

  describe('OpenAiAdapter', () => {
    it('should format request and return chat response on success', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from OpenAI' } }],
          usage: { total_tokens: 15 },
        }),
      } as Response);

      const res = await openAiAdapter.chat(
        [{ role: 'user', content: 'Hi' }],
        'test-key',
        'gpt-4o',
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        }),
      );
      expect(res).toEqual({ content: 'Hello from OpenAI', tokensUsed: 15 });

      fetchSpy.mockRestore();
    });

    it('should throw ProviderApiException on non-2xx status', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(
        openAiAdapter.chat([{ role: 'user', content: 'Hi' }], 'bad-key', 'gpt-4o'),
      ).rejects.toThrow(ProviderApiException);

      fetchSpy.mockRestore();
    });

    it('healthCheck should return true when API returns 200', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
      } as Response);

      const isHealthy = await openAiAdapter.healthCheck('test-key');
      expect(isHealthy).toBe(true);

      fetchSpy.mockRestore();
    });
  });

  describe('ClaudeAdapter', () => {
    it('should format system and user messages and return response', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: 'Hello from Claude' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      } as Response);

      const res = await claudeAdapter.chat(
        [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hi' },
        ],
        'test-key',
        'claude-3-5-sonnet-20241022',
      );

      expect(res).toEqual({ content: 'Hello from Claude', tokensUsed: 15 });

      fetchSpy.mockRestore();
    });
  });

  describe('GeminiAdapter', () => {
    it('should format contents correctly for Gemini and return response', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
          usageMetadata: { totalTokenCount: 20 },
        }),
      } as Response);

      const res = await geminiAdapter.chat(
        [{ role: 'user', content: 'Hi' }],
        'test-key',
        'gemini-1.5-pro',
      );

      expect(res).toEqual({ content: 'Hello from Gemini', tokensUsed: 20 });

      fetchSpy.mockRestore();
    });
  });
});
