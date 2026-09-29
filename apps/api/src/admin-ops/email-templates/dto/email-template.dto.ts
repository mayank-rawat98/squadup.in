import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  EMAIL_AUDIENCE,
  TEMPLATE_ID_PATTERN,
} from '../../../mailer/constants/mailer.constants';

/** Trims a string and turns an empty one into null, meaning "clear it". */
const toNullableTrimmed = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Shape only. Whether the app actually sends that email is the service's
 * question, answered with a 404.
 */
export class EmailTemplateParamsDto {
  @ApiProperty({
    enum: EMAIL_AUDIENCE,
    description: 'Who the email is sent to',
  })
  @IsEnum(EMAIL_AUDIENCE)
  audience!: EMAIL_AUDIENCE;

  @ApiProperty({ example: 'welcome' })
  @Matches(/^[A-Za-z_]{1,64}$/, {
    message: 'emailType may hold letters and underscores only',
  })
  emailType!: string;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({
    example: 'tpl_aB3xK9mZ',
    nullable: true,
    description: 'The mailtr templateId. Null or empty clears it.',
  })
  @IsOptional()
  @Transform(toNullableTrimmed)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(TEMPLATE_ID_PATTERN, {
    message:
      'templateId may hold letters, digits, hyphens and underscores only, up to 128 characters. Copy it from mailtr, e.g. tpl_aB3xK9mZ.',
  })
  templateId?: string | null;

  @ApiPropertyOptional({
    example: 'hello@squadup.in',
    nullable: true,
    description: 'Sender for this email. Null or empty uses MAILTR_FROM_EMAIL.',
  })
  @IsOptional()
  @Transform(toNullableTrimmed)
  @ValidateIf((_, value) => value !== null)
  @IsEmail({}, { message: 'fromEmail must be an email address' })
  @MaxLength(255)
  fromEmail?: string | null;

  @ApiPropertyOptional({ description: 'False stops this email being sent' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
