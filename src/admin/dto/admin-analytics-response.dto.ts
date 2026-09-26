import { ApiProperty } from '@nestjs/swagger';

export class RequestsPerDayDto {
  @ApiProperty({ example: '2026-09-26', description: 'Date in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ example: 42, description: 'Total requests on this day' })
  count: number;
}

export class RequestsPerEndpointDto {
  @ApiProperty({ example: '/api/v1/chat', description: 'API endpoint route' })
  endpoint: string;

  @ApiProperty({ example: 100, description: 'Total requests to this endpoint' })
  count: number;
}

export class AdminAnalyticsResponseDto {
  @ApiProperty({ type: [RequestsPerDayDto] })
  requestsPerDay: RequestsPerDayDto[];

  @ApiProperty({ type: [RequestsPerEndpointDto] })
  requestsPerEndpoint: RequestsPerEndpointDto[];
}
