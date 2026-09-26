import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import { RolesGuard } from '../common/guards';
import {
  CreateProviderDto,
  ProviderHealthResponseDto,
  ProviderResponseDto,
  UpdateProviderDto,
} from './dto';
import { ProvidersService } from './providers.service';

@ApiTags('Providers')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new AI provider configuration' })
  @ApiResponse({
    status: 201,
    description: 'Provider created successfully.',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (creating system provider requires ADMIN role).',
  })
  async create(
    @CurrentUser() user: any,
    @Body() createProviderDto: CreateProviderDto,
  ) {
    return this.providersService.create(user, createProviderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List AI providers visible to current user (own + system)',
  })
  @ApiResponse({
    status: 200,
    description: 'Providers list retrieved successfully.',
    type: [ProviderResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@CurrentUser() user: any) {
    return this.providersService.findAll(user);
  }

  @Get(':id/health')
  @ApiOperation({
    summary: 'Check health and API key validity of an AI provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed.',
    type: ProviderHealthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Provider not found or not visible.',
  })
  async checkHealth(@CurrentUser() user: any, @Param('id') id: string) {
    return this.providersService.checkHealth(user, id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle enabled state of an AI provider' })
  @ApiResponse({
    status: 200,
    description: 'Provider enabled state toggled.',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Provider not found or not owned by user.',
  })
  async toggle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.providersService.toggle(user, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set an AI provider as default for its scope' })
  @ApiResponse({
    status: 200,
    description: 'Provider set as default successfully.',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Provider not found or not owned by user.',
  })
  async setDefault(@CurrentUser() user: any, @Param('id') id: string) {
    return this.providersService.setDefault(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an AI provider configuration' })
  @ApiResponse({
    status: 200,
    description: 'Provider updated successfully.',
    type: ProviderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Provider not found or not owned by user.',
  })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providersService.update(user, id, updateProviderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an AI provider configuration' })
  @ApiResponse({
    status: 204,
    description: 'Provider deleted successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 404,
    description: 'Provider not found or not owned by user.',
  })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    await this.providersService.remove(user, id);
  }
}
