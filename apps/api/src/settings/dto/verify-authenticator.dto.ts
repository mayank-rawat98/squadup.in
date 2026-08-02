import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyAuthenticatorDto {
  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code from your authenticator app',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}
