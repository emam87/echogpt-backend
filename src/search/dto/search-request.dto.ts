import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchRequestDto {
  @ApiProperty({
    example: 'NestJS web search integration',
    description: 'The search query string',
  })
  @IsString()
  @IsNotEmpty()
  query: string;
}
