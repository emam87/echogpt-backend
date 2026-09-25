import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'CurrentPassword123!', description: 'Current user password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecretPassword123!', description: 'New password (minimum 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
