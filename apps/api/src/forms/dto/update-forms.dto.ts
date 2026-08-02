import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContactStatus } from '../entities/contactUs.entity';
import {
  GrievancePriority,
  GrievanceStatus,
} from '../entities/grievance.entity';

export class UpdateContactUsForm {
  @IsNotEmpty()
  @IsEnum(ContactStatus)
  status!: ContactStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class UpdateGrievanceFormDto {
  @IsNotEmpty()
  @IsEnum(GrievanceStatus)
  status!: GrievanceStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(GrievancePriority)
  priority?: GrievancePriority;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class UpdateCareerForm {
  @IsNotEmpty()
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
