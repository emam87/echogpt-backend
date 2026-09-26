import { ApiProperty } from '@nestjs/swagger';

export class AdminProviderItemDto {
  @ApiProperty({ example: 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', nullable: true })
  userId: string | null;

  @ApiProperty({ example: 'john@example.com', description: 'User email or "system"' })
  ownerEmail: string;

  @ApiProperty({ example: 'OPENAI' })
  type: string;

  @ApiProperty({ example: 'OpenAI GPT-4o' })
  name: string;

  @ApiProperty({ example: 'gpt-4o' })
  model: string;

  @ApiProperty({ example: '****abcd', description: 'Masked API key' })
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

export class PaginatedAdminProvidersDto {
  @ApiProperty({ type: [AdminProviderItemDto] })
  data: AdminProviderItemDto[];

  @ApiProperty({ example: 5 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
