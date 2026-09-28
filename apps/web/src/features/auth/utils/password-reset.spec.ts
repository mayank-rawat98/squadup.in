/**
 * @jest-environment node
 */
import { ApiError } from '@/lib/api/api-error';
import { looksSentAnyway } from './password-reset';

describe('looksSentAnyway', () => {
  it.each([
    [404, 'an unknown address'],
    [400, 'a send the API could not complete'],
  ])('hides a %i (%s) behind the same message', (status) => {
    expect(looksSentAnyway(new ApiError('User not found', status))).toBe(true);
  });

  it.each([
    [429, 'a rate limit'],
    [0, 'a network failure'],
    [500, 'a server error'],
  ])('shows a %i (%s)', (status) => {
    expect(looksSentAnyway(new ApiError('Nope', status))).toBe(false);
  });

  it('shows anything that is not an API error', () => {
    expect(looksSentAnyway(new Error('boom'))).toBe(false);
  });
});
