import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { GrievanceType } from '../entities/grievance.entity';

export class CreateGrievanceFormDto {
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @Transform(({ value }) => value?.toLowerCase?.())
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsEnum(GrievanceType)
  grievanceType!: GrievanceType;
}
export class QueryGrievanceFormDto extends PartialType(
  CreateGrievanceFormDto,
) {}
