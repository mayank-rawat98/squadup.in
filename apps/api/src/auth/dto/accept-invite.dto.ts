import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @Length(64, 64)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;
}

export class AcceptInviteExistingDto {
  @IsString()
  @Length(64, 64)
  token!: string;
}
