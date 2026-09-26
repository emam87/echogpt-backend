import { ApiProperty } from '@nestjs/swagger';

export class ChatReplyDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'The conversation ID (created or existing)',
  })
  conversationId: string;

  @ApiProperty({
    example: 'Quantum computing is a type of computing that relies on quantum physics...',
    description: 'The response message from the AI provider',
  })
  reply: string;

  @ApiProperty({
    example: 45,
    description: 'Total tokens consumed by request and response',
  })
  tokensUsed: number;
}
