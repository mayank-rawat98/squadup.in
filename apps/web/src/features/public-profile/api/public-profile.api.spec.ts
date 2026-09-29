/**
 * @jest-environment node
 */
import { getPublicProfile } from './public-profile.api';

const PROFILE = {
  username: 'asha_v',
  fullName: 'Asha Verma',
  avatarUrl: null,
  joinedAt: '2026-09-01T00:00:00.000Z',
};

describe('getPublicProfile', () => {
  const fetchMock = jest.fn();

  beforeAll(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test/api/v1';
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => fetchMock.mockReset());

  it('returns the profile', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: PROFILE }), {
        status: 200,
      }),
    );

    await expect(getPublicProfile('asha_v')).resolves.toEqual(PROFILE);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://api.test/api/v1/users/public/asha_v',
    );
  });

  it.each([404, 400])('returns null on %s', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    await expect(getPublicProfile('nobody')).resolves.toBeNull();
  });

  it('throws on a server error so the error page shows', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(getPublicProfile('asha_v')).rejects.toThrow(
      'Public profile request failed with 500',
    );
  });

  it('encodes the username into the path', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));
    await getPublicProfile('a/b');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://api.test/api/v1/users/public/a%2Fb',
    );
  });
});
