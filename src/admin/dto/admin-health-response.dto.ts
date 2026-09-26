import { ApiProperty } from '@nestjs/swagger';

export class AdminHealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Overall system status (ok / degraded)' })
  status: string;

  @ApiProperty({ example: 'connected', description: 'Database connection status (connected / error)' })
  database: string;

  @ApiProperty({ example: 3456.78, description: 'Process uptime in seconds' })
  uptime: number;

  @ApiProperty({ example: '2026-09-26T12:00:00.000Z', description: 'ISO timestamp of health check' })
  timestamp: string;
}
