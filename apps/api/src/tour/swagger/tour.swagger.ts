import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateTourDto } from '../dto/update-tour.dto';

export const TourTag = ApiTags('Tour');

const tourStateExample = {
  success: true,
  data: {
    pages: {
      dashboard: { completed: true, skipped: false },
      squads: { completed: false, skipped: false },
    },
    hasSeenIntroModal: true,
    hasOptedOutOfTours: false,
    seenAnnouncements: ['squad-invites'],
  },
  message: 'Tour state retrieved successfully',
};

export const GetTourDocs = applyDecorators(
  ApiOperation({
    summary: 'Get the current user’s guide-tour state',
    description:
      'Returns per-page completion flags plus the global intro/opt-out flags. ' +
      'Lazily creates a default row on first access.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiResponse({
    status: 200,
    description: 'Tour state retrieved successfully',
    schema: { example: tourStateExample },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const UpdateTourDocs = applyDecorators(
  ApiOperation({
    summary: 'Update the current user’s guide-tour state',
    description:
      'Partial update. Provide `page` with `completed`/`skipped` to update a ' +
      'page tour, the global flags `hasSeenIntroModal` / `hasOptedOutOfTours`, ' +
      'and/or `seenAnnouncement` to mark a what’s-new announcement dismissed.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiBody({ type: UpdateTourDto }),
  ApiResponse({
    status: 200,
    description: 'Tour state updated successfully',
    schema: { example: tourStateExample },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);

export const ResetTourDocs = applyDecorators(
  ApiOperation({
    summary: 'Reset the current user’s guide-tour state',
    description:
      'Clears all page progress, global flags and seen announcements back to defaults.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiResponse({
    status: 200,
    description: 'Tour state reset successfully',
    schema: { example: tourStateExample },
  }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
);
