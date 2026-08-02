import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { IsValidPhone } from '../../validator/customDtoValidator';
import { Transform } from 'class-transformer';

export class SendMobileOtpDto {
  @ApiProperty({
    description: 'The phone number of the user',
    example: '+1234567890',
  })
  @IsString()
  @IsValidPhone({ message: 'Invalid phone number' })
  @Transform(({ value }) => value.replace(/\s+/g, ''))
  @IsNotEmpty()
  phone!: string;
}

export class VerifyMobileOtpDto {
  @ApiProperty({
    description: '6-digit OTP sent to the mobile number',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}
