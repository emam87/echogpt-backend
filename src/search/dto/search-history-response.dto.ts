import { ApiProperty } from '@nestjs/swagger';

export class SearchHistoryItemDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'NestJS web search integration' })
  query: string;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-26T13:00:00.000Z', nullable: true })
  cachedUntil: Date | null;
}

export class PaginatedSearchHistoryDto {
  @ApiProperty({ type: [SearchHistoryItemDto] })
  data: SearchHistoryItemDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
