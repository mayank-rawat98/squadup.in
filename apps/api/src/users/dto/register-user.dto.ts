import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'test@example.com',
  })
  @Transform(({ value }) => value?.toLowerCase?.())
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'password123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description:
      'User has accepted the Terms of Service & Privacy Policy. Must be true.',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms and Privacy Policy' })
  acceptedTerms!: boolean;
}
