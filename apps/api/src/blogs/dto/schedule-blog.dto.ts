import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/** Body for the "Schedule your Blog" modal. */
export class ScheduleBlogDto {
  @ApiProperty({ example: '2026-05-08T09:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;
}
