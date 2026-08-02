import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidPhone } from '../../validator/customDtoValidator';

export class CreateUserDto {
  @ApiProperty({
    description: 'The full name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    description: 'The phone number of the user',
    example: '+1234567890',
  })
  @IsString()
  @IsValidPhone({ message: 'Invalid phone number' })
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    description: 'The address line 1 of the user',
    example: '123 Main St',
  })
  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @ApiProperty({
    description: 'The city of the user',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({
    description: 'The state or province of the user',
    example: 'New York',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'The postal code of the user',
    example: '10001',
  })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @ApiProperty({
    description: 'The country of the user',
    example: 'USA',
  })
  @IsString()
  @IsNotEmpty()
  country!: string;
}
