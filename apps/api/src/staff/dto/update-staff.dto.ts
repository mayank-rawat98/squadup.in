import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StaffStatus } from '../entities/staff.entity';

export class UpdateStaffDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ enum: StaffStatus, description: 'Account status' })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}

export class ChangeStaffPasswordDto {
  @ApiPropertyOptional({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
