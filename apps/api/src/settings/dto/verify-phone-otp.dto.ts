import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';

export class VerifyPhoneOtpDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code sent to your phone',
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}
