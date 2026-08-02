import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;

  @IsOptional()
  @IsString()
  password?: string;

  /** TOTP code if user has authenticator 2FA enabled. */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totp?: string;

  /**
   * OTP from the user's CURRENT email (only required for accounts without
   * a password set, e.g. Google OAuth signups). Obtain via the
   * /email-change/preauth endpoint first.
   */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  preauthOtp?: string;
}

export class ConfirmEmailChangeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;
}
