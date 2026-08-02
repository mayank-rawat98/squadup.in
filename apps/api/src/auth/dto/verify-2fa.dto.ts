import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  Length,
} from 'class-validator';
import { TwoFactorMethod } from '../../settings/entities/user-settings.entity';

export class VerifyTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description:
      'The verification code (6-digit OTP for authenticator/email/phone, or up to 12-char backup code)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 12)
  code!: string;

  @ApiProperty({
    enum: TwoFactorMethod,
    example: TwoFactorMethod.AUTHENTICATOR,
    description: 'The 2FA method being verified',
  })
  @IsEnum(TwoFactorMethod)
  @IsNotEmpty()
  method!: TwoFactorMethod;
}

export class VerifyPasskeyLoginDto {
  @ApiProperty({
    description: 'WebAuthn authentication response JSON from the browser',
  })
  @IsObject()
  @IsNotEmpty()
  response!: Record<string, unknown>;
}

export class SelectTwoFactorMethodDto {
  @ApiProperty({
    enum: TwoFactorMethod,
    example: TwoFactorMethod.EMAIL,
    description:
      'The 2FA method to use. For email/phone this triggers OTP delivery. For authenticator/backupCode, confirms readiness.',
  })
  @IsEnum(TwoFactorMethod)
  @IsNotEmpty()
  method!: TwoFactorMethod;
}
