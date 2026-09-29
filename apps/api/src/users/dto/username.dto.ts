import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import {
  USERNAME_PATTERN,
  USERNAME_RULES_MESSAGE,
} from '../constants/username.constants';

/** Trims and lowercases, so `Asha_V ` and `asha_v` are one name. */
export const NormaliseUsername = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export class UsernameQueryDto {
  @ApiProperty({ example: 'asha_v' })
  @NormaliseUsername()
  @IsString()
  @Matches(USERNAME_PATTERN, { message: USERNAME_RULES_MESSAGE })
  username!: string;
}
