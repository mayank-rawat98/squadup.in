// users/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import {
  USERNAME_PATTERN,
  USERNAME_RULES_MESSAGE,
} from '../constants/username.constants';
import { CreateUserDto } from './create-user.dto';
import { NormaliseUsername } from './username.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  readonly avatarUrl?: string;

  /** Reserved names are rejected by the service, which can say why. */
  @ApiPropertyOptional({ example: 'asha_v' })
  @IsOptional()
  @NormaliseUsername()
  @IsString()
  @Matches(USERNAME_PATTERN, { message: USERNAME_RULES_MESSAGE })
  readonly username?: string;
}
