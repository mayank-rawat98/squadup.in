import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SEARCH_RESULT_TYPE } from '../constants/search.constants';

export const GlobalSearchDocs = applyDecorators(
  ApiOperation({
    summary: 'Search everything the caller can see',
    description:
      'One query, fanned out across every domain that registers a search ' +
      'provider. Today that is published blog posts.\n\n' +
      '**Scoping:** each provider reuses its own domain’s visibility rules, so ' +
      'a result only appears if the caller could already see it elsewhere. ' +
      'Search is a new door onto existing data, not a wider one.\n\n' +
      '**Matching:** case-insensitive substring (`ILIKE %q%`) on each type’s ' +
      'display fields. No typo tolerance and no cross-type ranking — groups come ' +
      'back in a fixed, learnable order.\n\n' +
      '**Resilience:** providers run in parallel, each raced against a timeout. ' +
      'A domain that fails or overruns is dropped from the response and logged; ' +
      'the rest still return.',
  }),
  ApiBearerAuth('JWT-auth'),
  ApiResponse({
    status: 200,
    description:
      'Hits grouped by type, in display order. Empty groups omitted.',
    schema: {
      example: {
        success: true,
        data: {
          total: 1,
          groups: [
            {
              type: SEARCH_RESULT_TYPE.BLOG,
              items: [
                {
                  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                  type: 'blog',
                  title: 'How to Draft a Winning Squad',
                  subtitle: 'Five things every captain checks first.',
                  meta: { slug: 'how-to-draft-a-winning-squad' },
                },
              ],
            },
          ],
        },
        message: 'Search results fetched successfully',
      },
    },
  }),
  ApiResponse({
    status: 400,
    description: 'Query shorter than the 2-character minimum.',
  }),
);
