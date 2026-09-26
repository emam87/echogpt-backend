import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({
    enum: ProviderType,
    example: 'OPENAI',
    description: 'AI Provider type (OPENAI, CLAUDE, GEMINI)',
  })
  @IsEnum(ProviderType)
  type: ProviderType;

  @ApiProperty({
    example: 'OpenAI GPT-4o',
    description: 'User-friendly name for the provider configuration',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'gpt-4o',
    description: 'Model identifier used for requests',
  })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({
    example: 'sk-proj-1234567890abcdef1234567890abcdef',
    description: 'API key for the AI provider (will be encrypted before storage)',
  })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as default provider for this owner',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Create as a system-wide provider (ADMIN only)',
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
