import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateCareerFormDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @Transform(({ value }) => value?.toLowerCase?.())
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  socialLinks!: string;
}

export class QueryCareerForm extends PartialType(CreateCareerFormDto) {}
