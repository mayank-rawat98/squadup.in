import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateChangelogDto } from '../dto/create-changelog.dto';
import { UpdateChangelogDto } from '../dto/update-changelog.dto';

export const ChangelogTag = ApiTags('Changelog');

export const GetChangelogsDocs = applyDecorators(
  ApiOperation({
    summary: 'Get all changelog entries (Public)',
    description:
      'Returns a paginated list of changelog entries sorted by date descending.',
  }),
  ApiResponse({
    status: 200,
    description: 'Changelog entries fetched successfully.',
  }),
);

export const GetChangelogByIdDocs = applyDecorators(
  ApiOperation({ summary: 'Get a changelog entry by ID' }),
  ApiParam({ name: 'id', description: 'Changelog entry UUID' }),
  ApiResponse({ status: 200, description: 'Changelog entry found.' }),
  ApiResponse({ status: 404, description: 'Changelog entry not found.' }),
);

export const CreateChangelogDocs = applyDecorators(
  ApiBearerAuth(),
  ApiOperation({ summary: 'Create a changelog entry (Admin only)' }),
  ApiBody({ type: CreateChangelogDto }),
  ApiResponse({
    status: 201,
    description: 'Changelog entry created successfully.',
  }),
  ApiResponse({ status: 409, description: 'Version already exists.' }),
);

export const UpdateChangelogDocs = applyDecorators(
  ApiBearerAuth(),
  ApiOperation({ summary: 'Update a changelog entry (Admin only)' }),
  ApiParam({ name: 'id', description: 'Changelog entry UUID' }),
  ApiBody({ type: UpdateChangelogDto }),
  ApiResponse({
    status: 200,
    description: 'Changelog entry updated successfully.',
  }),
  ApiResponse({ status: 404, description: 'Changelog entry not found.' }),
);

export const DeleteChangelogDocs = applyDecorators(
  ApiBearerAuth(),
  ApiOperation({ summary: 'Delete a changelog entry (Admin only)' }),
  ApiParam({ name: 'id', description: 'Changelog entry UUID' }),
  ApiResponse({
    status: 200,
    description: 'Changelog entry deleted successfully.',
  }),
  ApiResponse({ status: 404, description: 'Changelog entry not found.' }),
);
