import { ApiProperty } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';

export class ProviderResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', nullable: true })
  userId: string | null;

  @ApiProperty({ enum: ProviderType, example: 'OPENAI' })
  type: ProviderType;

  @ApiProperty({ example: 'OpenAI GPT-4o' })
  name: string;

  @ApiProperty({ example: 'gpt-4o' })
  model: string;

  @ApiProperty({ example: 'sk-****abcd', description: 'Masked API key (last 4 characters)' })
  apiKey: string;

  @ApiProperty({ example: true })
  isEnabled: boolean;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  updatedAt: Date;
}

export class ProviderHealthResponseDto {
  @ApiProperty({ example: true, description: 'Whether the provider API key is healthy and working' })
  healthy: boolean;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z', description: 'ISO timestamp when check was performed' })
  checkedAt: string;
}
