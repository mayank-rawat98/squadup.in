import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestFeatureAccessDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
