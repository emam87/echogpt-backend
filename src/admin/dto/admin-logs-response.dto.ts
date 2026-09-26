import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminLogItemDto {
  @ApiProperty({ example: 'l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiPropertyOptional({ example: 'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', nullable: true })
  userId: string | null;

  @ApiPropertyOptional({ example: 'p0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', nullable: true })
  providerId: string | null;

  @ApiProperty({ example: '/api/v1/chat' })
  endpoint: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 25 })
  tokensUsed: number;

  @ApiProperty({ example: 450 })
  latencyMs: number;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedAdminLogsDto {
  @ApiProperty({ type: [AdminLogItemDto] })
  data: AdminLogItemDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
