import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class VerifyPasskeyRegistrationDto {
  @ApiProperty({
    description: 'WebAuthn registration response JSON from the browser',
  })
  @IsObject()
  @IsNotEmpty()
  response!: Record<string, unknown>;

  @ApiProperty({ example: 'MacBook Touch ID', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nickname?: string;
}

export class RenamePasskeyDto {
  @ApiProperty({ example: 'Work laptop' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nickname!: string;
}
