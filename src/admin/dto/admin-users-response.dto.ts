import { ApiProperty } from '@nestjs/swagger';

export class AdminUserItemDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'USER' })
  role: string;

  @ApiProperty({ example: 'FREE' })
  currentPlan: string;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedAdminUsersDto {
  @ApiProperty({ type: [AdminUserItemDto] })
  data: AdminUserItemDto[];

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
