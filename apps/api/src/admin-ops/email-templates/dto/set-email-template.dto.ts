import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { EMAIL_AUDIENCE } from '../../../mailer/constants/mailer.constants';

export class SetEmailTemplateDto {
  @ApiProperty({
    description: 'Which functionality this template renders',
    example: 'welcome',
  })
  @IsString()
  @MaxLength(64)
  emailType!: string;

  @ApiProperty({ enum: EMAIL_AUDIENCE, description: 'Who the email is sent to' })
  @IsEnum(EMAIL_AUDIENCE)
  audience!: EMAIL_AUDIENCE;

  @ApiPropertyOptional({
    description: 'The mailtr template id; null clears the mapping',
    example: 'tpl_aB3xK9mZ',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(128)
  templateId?: string | null;

  @ApiPropertyOptional({
    description: 'Per-template sender override; null uses the account default',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  fromEmail?: string | null;

  @ApiPropertyOptional({ description: 'Set false to suppress this email' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
