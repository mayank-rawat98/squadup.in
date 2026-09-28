import {
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'The encoded email address',
    example: 'user%40example.com',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  encodedEmail!: string;

  @ApiProperty({
    description: 'The password reset token',
    example: 'abc123xyz',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  token!: string;

  // Same rules as registration (RegisterUserDto), so a reset can't set a
  // password that sign-up would have refused.
  @ApiProperty({
    description: 'The new password',
    example: 'NewPassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
