import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('remaining')
  @ApiOperation({ summary: 'Get remaining daily usage limit details' })
  @ApiResponse({
    status: 200,
    description: 'Usage remaining details retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getRemaining(@CurrentUser('id') userId: string) {
    return this.usageService.getUsageInfo(userId);
  }
}
