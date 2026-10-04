import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  BOARD_NAME_MAX_LENGTH,
  BOARD_SEAT_OPTIONS,
  BoardLanguage,
} from '../constants/board.constants';

export class CreateBoardDto {
  @ApiProperty({ example: 'Two-sum warmup', maxLength: BOARD_NAME_MAX_LENGTH })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Give the room a name so your squad recognises it.' })
  @MaxLength(BOARD_NAME_MAX_LENGTH, {
    message: `Room names can be up to ${BOARD_NAME_MAX_LENGTH} characters.`,
  })
  name!: string;

  @ApiProperty({ enum: BoardLanguage, example: BoardLanguage.CPP })
  @IsEnum(BoardLanguage, { message: 'Pick one of the listed languages.' })
  language!: BoardLanguage;

  @ApiProperty({ enum: BOARD_SEAT_OPTIONS, example: 8 })
  @IsIn(BOARD_SEAT_OPTIONS, {
    message: `Seats must be one of ${BOARD_SEAT_OPTIONS.join(', ')}.`,
  })
  seats!: number;
}
