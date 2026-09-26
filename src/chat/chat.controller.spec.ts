import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;

  const userId = 'u1';
  const mockChatService = {
    sendMessage: jest.fn(),
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    deleteConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  it('sendMessage should delegate to service.sendMessage', async () => {
    const dto = { message: 'Hello' };
    const expected = { conversationId: 'c1', reply: 'Hi', tokensUsed: 10 };
    mockChatService.sendMessage.mockResolvedValue(expected);

    const result = await controller.sendMessage(userId, dto);

    expect(service.sendMessage).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });

  it('getConversations should delegate to service.getConversations with default page and limit', async () => {
    const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    mockChatService.getConversations.mockResolvedValue(expected);

    const result = await controller.getConversations(userId);

    expect(service.getConversations).toHaveBeenCalledWith(userId, 1, 20);
    expect(result).toBe(expected);
  });

  it('getMessages should delegate to service.getMessages', async () => {
    const expected = [{ id: 'm1', content: 'Hi' }];
    mockChatService.getMessages.mockResolvedValue(expected);

    const result = await controller.getMessages(userId, 'c1');

    expect(service.getMessages).toHaveBeenCalledWith(userId, 'c1');
    expect(result).toBe(expected);
  });

  it('deleteConversation should delegate to service.deleteConversation', async () => {
    mockChatService.deleteConversation.mockResolvedValue(undefined);

    await controller.deleteConversation(userId, 'c1');

    expect(service.deleteConversation).toHaveBeenCalledWith(userId, 'c1');
  });
});
