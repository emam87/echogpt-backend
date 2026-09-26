import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  userId: string;

  @ApiPropertyOptional({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', nullable: true })
  providerId: string | null;

  @ApiProperty({ example: 'Explain quantum computing...' })
  title: string;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  updatedAt: Date;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44' })
  id: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  conversationId: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ASSISTANT', 'SYSTEM'] })
  role: string;

  @ApiProperty({ example: 'Hello, how are you?' })
  content: string;

  @ApiPropertyOptional({ example: 12, nullable: true })
  tokens: number | null;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  createdAt: Date;
}
