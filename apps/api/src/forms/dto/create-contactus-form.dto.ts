import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { InquiryType } from '../entities/contactUs.entity';

export class CreateContactUsFormDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @Transform(({ value }) => value?.toLowerCase?.())
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsEnum(InquiryType)
  inquiryType!: InquiryType;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  company?: string;
}
export class QueryContactUsFormDto extends PartialType(
  CreateContactUsFormDto,
) {}
