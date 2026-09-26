import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'Explain quantum computing in simple terms.',
    description: 'The user prompt message to send to the AI provider',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Existing conversation ID to continue (optional)',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Specific AI Provider ID to use (optional, defaults to user/system default)',
  })
  @IsOptional()
  @IsString()
  providerId?: string;
}
