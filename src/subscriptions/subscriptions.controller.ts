import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current user active subscription status' })
  @ApiResponse({
    status: 200,
    description: 'Active subscription status retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Active subscription not found.' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getStatus(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade subscription to PREMIUM plan' })
  @ApiResponse({
    status: 200,
    description: 'Subscription upgraded to PREMIUM successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Active subscription not found.' })
  @ApiResponse({
    status: 409,
    description: 'User is already on PREMIUM plan.',
  })
  async upgrade(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.upgrade(userId);
  }
}

