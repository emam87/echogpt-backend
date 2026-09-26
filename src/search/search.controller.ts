import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import {
  PaginatedSearchHistoryDto,
  SearchRequestDto,
  SearchResponseDto,
} from './dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('search')
  @ApiOperation({ summary: 'Perform web search (cached or mock provider)' })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully.',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 429, description: 'Daily request limit exceeded.' })
  async search(
    @CurrentUser('id') userId: string,
    @Body() searchRequestDto: SearchRequestDto,
  ) {
    return this.searchService.search(userId, searchRequestDto);
  }

  @Get('search/history')
  @ApiOperation({ summary: "List current user's search history (paginated)" })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Search history retrieved successfully.',
    type: PaginatedSearchHistoryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.searchService.getHistory(userId, pageNum, limitNum);
  }

  @Get('search/recent')
  @ApiOperation({ summary: 'List last 5 distinct queries by current user' })
  @ApiResponse({
    status: 200,
    description: 'Recent searches retrieved successfully.',
    type: [String],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getRecent(@CurrentUser('id') userId: string) {
    return this.searchService.getRecent(userId);
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: "Get search suggestions from user's past queries" })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'nest' })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions retrieved successfully.',
    type: [String],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Query('q') partial?: string,
  ) {
    return this.searchService.getSuggestions(userId, partial || '');
  }
}
