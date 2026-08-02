import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DisableAuthenticatorDto {
  @ApiProperty({
    example: '123456',
    description:
      'Either a 6-digit TOTP code from your authenticator app or a 12-character one-time backup code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{6}|[A-Za-z0-9]{12})$/, {
    message:
      'Code must be a 6-digit authenticator code or a 12-character backup code',
  })
  code!: string;
}
