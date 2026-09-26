import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserRoleEnum {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: UserRoleEnum,
    example: 'ADMIN',
    description: 'New role to assign to the user (USER or ADMIN)',
  })
  @IsEnum(UserRoleEnum)
  @IsNotEmpty()
  role: UserRoleEnum;
}
