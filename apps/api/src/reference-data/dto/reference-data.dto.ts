import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @Length(2, 8)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'code must be alphanumeric' })
  code!: string;

  @IsString()
  @Length(1, 64)
  label!: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(1, 8)
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTimezoneDto {
  @IsString()
  @Length(2, 64)
  @Matches(/^[A-Za-z][A-Za-z0-9_+\-/]*$/, {
    message: 'code must be a valid IANA timezone identifier',
  })
  code!: string;

  @IsString()
  @Length(1, 128)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTimezoneDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLanguageDto {
  @IsString()
  @Length(2, 16)
  @Matches(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, {
    message: 'code must be a BCP-47 language tag',
  })
  code!: string;

  @IsString()
  @Length(1, 64)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
