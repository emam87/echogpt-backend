import { ApiProperty } from '@nestjs/swagger';

export class ActiveSubscriptionsCountDto {
  @ApiProperty({ example: 10, description: 'Number of active FREE plan subscriptions' })
  free: number;

  @ApiProperty({ example: 2, description: 'Number of active PREMIUM plan subscriptions' })
  premium: number;
}

export class AdminStatsResponseDto {
  @ApiProperty({ example: 12, description: 'Total registered users count' })
  totalUsers: number;

  @ApiProperty({ example: 34, description: 'Total conversations count' })
  totalConversations: number;

  @ApiProperty({ example: 120, description: 'Total messages count' })
  totalMessages: number;

  @ApiProperty({ example: 15, description: 'Total web searches count' })
  totalSearches: number;

  @ApiProperty({ type: ActiveSubscriptionsCountDto })
  activeSubscriptions: ActiveSubscriptionsCountDto;

  @ApiProperty({ example: 45, description: 'Count of API requests created today' })
  requestsToday: number;
}
