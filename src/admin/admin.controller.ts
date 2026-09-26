import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubStatus } from '@prisma/client';
import { Roles } from '../common/decorators';
import { RolesGuard } from '../common/guards';
import { AdminService } from './admin.service';
import {
  AdminAnalyticsResponseDto,
  AdminHealthResponseDto,
  AdminStatsResponseDto,
  PaginatedAdminLogsDto,
  PaginatedAdminProvidersDto,
  PaginatedAdminSubscriptionsDto,
  PaginatedAdminUsersDto,
  UpdateUserRoleDto,
} from './dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard stats summary' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully.',
    type: AdminStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system and database health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully.',
    type: AdminHealthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getHealth() {
    return this.adminService.getHealth();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all registered users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'john' })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully.',
    type: PaginatedAdminUsersDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.adminService.getUsers(pageNum, limitNum, search);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: "Change a user's role (USER or ADMIN)" })
  @ApiResponse({ status: 200, description: 'User role updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  @ApiResponse({ status: 404, description: 'User or Role not found.' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, updateUserRoleDto);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: SubStatus })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions list retrieved successfully.',
    type: PaginatedAdminSubscriptionsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: SubStatus,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.adminService.getSubscriptions(pageNum, limitNum, status);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List all AI providers (system + users)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'AI Providers list retrieved successfully.',
    type: PaginatedAdminProvidersDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getProviders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    return this.adminService.getProviders(pageNum, limitNum);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get request analytics and usage breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully.',
    type: AdminAnalyticsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('logs')
  @ApiOperation({ summary: 'List raw API usage logs (paginated & filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'statusCode', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Usage logs retrieved successfully.',
    type: PaginatedAdminLogsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role).' })
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('statusCode') statusCode?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    const statusNum = statusCode ? parseInt(statusCode, 10) : undefined;
    return this.adminService.getLogs(pageNum, limitNum, userId, statusNum);
  }
}
