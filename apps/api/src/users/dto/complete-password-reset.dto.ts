import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompletePasswordResetDto {
  @ApiProperty({
    description: 'The one-time ticket returned after verifying the reset code',
  })
  @IsNotEmpty()
  @IsString()
  ticket!: string;

  @ApiProperty({
    description: 'The new password',
    example: 'NewPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
