import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import {
  ChatReplyDto,
  ConversationResponseDto,
  MessageResponseDto,
  SendMessageDto,
} from './dto';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a prompt message to an AI provider' })
  @ApiResponse({
    status: 201,
    description: 'Reply generated successfully.',
    type: ChatReplyDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Provider or conversation not found.' })
  @ApiResponse({ status: 429, description: 'Daily request limit exceeded.' })
  @ApiResponse({ status: 502, description: 'Bad Gateway - Provider communication error.' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Conversations list retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.chatService.getConversations(userId, pageNum, limitNum);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Messages list retrieved successfully.',
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.chatService.getMessages(userId, id);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation and its messages' })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Conversation not found.' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.chatService.deleteConversation(userId, id);
  }
}
