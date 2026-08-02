import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
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

  @ApiProperty({
    description: 'The new password',
    example: 'NewPassword123!',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
