import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ description: 'Staff email address' })
  @Transform(({ value }) => value?.toLowerCase?.())
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Staff password', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class StaffRefreshDto {
  @ApiProperty({ description: 'The refresh token issued at login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
