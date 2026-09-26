import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminSubscriptionItemDto {
  @ApiProperty({ example: 's0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  userId: string;

  @ApiProperty({ example: 'john@example.com' })
  userEmail: string;

  @ApiProperty({ example: 'PREMIUM' })
  planName: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  startedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  endsAt: Date | null;
}

export class PaginatedAdminSubscriptionsDto {
  @ApiProperty({ type: [AdminSubscriptionItemDto] })
  data: AdminSubscriptionItemDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
