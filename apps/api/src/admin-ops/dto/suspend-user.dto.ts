import { IsString, MaxLength, MinLength } from 'class-validator';

export class SuspendUserDto {
  /** Free-text violation reason — shown to admins and emailed to the user. */
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}
