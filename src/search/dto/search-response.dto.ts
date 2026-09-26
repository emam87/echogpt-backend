import { ApiProperty } from '@nestjs/swagger';

export class SearchResultItemDto {
  @ApiProperty({ example: 'Mock Result 1 for "NestJS"' })
  title: string;

  @ApiProperty({ example: 'https://example.com/result-1' })
  url: string;

  @ApiProperty({ example: 'This is a mock search snippet...' })
  snippet: string;
}

export class SearchResponseDto {
  @ApiProperty({ example: 'NestJS web search integration' })
  query: string;

  @ApiProperty({ type: [SearchResultItemDto] })
  results: SearchResultItemDto[];

  @ApiProperty({ example: false, description: 'Whether the response was returned from cache' })
  cached: boolean;
}
