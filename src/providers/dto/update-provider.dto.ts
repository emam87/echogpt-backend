import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProviderDto {
  @ApiPropertyOptional({
    example: 'Updated OpenAI Provider',
    description: 'Updated provider name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'gpt-4o-mini',
    description: 'Updated model identifier',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the provider is enabled',
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'sk-proj-newkey1234567890',
    description: 'New API key (will be re-encrypted if provided)',
  })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Set as default provider for this owner',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
