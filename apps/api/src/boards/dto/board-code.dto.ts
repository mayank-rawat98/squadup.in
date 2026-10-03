import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { BOARD_CODE_PATTERN } from '../constants/board.constants';
import { normalizeBoardCode } from '../utils/board-code';

/** A room code, as the join body and as the `:code` path parameter. */
export class BoardCodeDto {
  @ApiProperty({ example: 'K7Q2M' })
  @Transform(({ value }) => normalizeBoardCode(value))
  @IsString()
  @Matches(BOARD_CODE_PATTERN, {
    message: 'Room IDs have 5 letters and numbers. Check the ID and try again.',
  })
  code!: string;
}
