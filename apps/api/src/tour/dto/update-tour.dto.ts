import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Partial update to a user's tour state. When `page` is provided, the
 * `completed`/`skipped` flags apply to that page. The global flags
 * (`hasSeenIntroModal`, `hasOptedOutOfTours`) apply regardless of `page`.
 */
export class UpdateTourDto {
  @ApiPropertyOptional({
    description: 'Tour page key to update (e.g. dashboard, squads, arenas)',
    example: 'dashboard',
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Mark the page tour completed' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: 'Mark the page tour skipped' })
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;

  @ApiPropertyOptional({ description: 'Whether the intro modal has been seen' })
  @IsOptional()
  @IsBoolean()
  hasSeenIntroModal?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user opted out of all tours',
  })
  @IsOptional()
  @IsBoolean()
  hasOptedOutOfTours?: boolean;

  @ApiPropertyOptional({
    description:
      'Replay the guide tour: clears every page tour, the intro-modal flag and ' +
      'the opt-out, so the guide starts over from the beginning. Deliberately ' +
      'leaves the seen "what’s new" announcements alone — replaying the tour ' +
      'is not a request to be told about old releases again. (Use POST ' +
      '/tour/reset to clear everything, announcements included.)',
  })
  @IsOptional()
  @IsBoolean()
  resetPageTours?: boolean;

  @ApiPropertyOptional({
    description:
      'Id of a one-time "what’s new" announcement the user has dismissed. ' +
      'Added to the seen set; re-sending the same id is a no-op.',
    example: 'squad-invites',
  })
  @IsOptional()
  @IsString()
  seenAnnouncement?: string;

  @ApiPropertyOptional({
    description:
      'Ids of one-time "what’s new" announcements the user has dismissed, for ' +
      'dismissing a batch in a single request (e.g. "Skip all" in the catch-up ' +
      'modal). Unioned into the seen set exactly like `seenAnnouncement`; the ' +
      'two may be sent together and ids already present are a no-op.',
    example: ['squad-invites', 'arena-leaderboards'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seenAnnouncements?: string[];
}
