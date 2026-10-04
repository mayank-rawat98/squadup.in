import { screen } from '@testing-library/react';
import { listFeatureFlags } from '../api/feature-flags.api';
import { flag, renderWithQuery } from './feature-flags.test-utils';
import FeatureFlagsScreen from './FeatureFlagsScreen';

jest.mock('../api/feature-flags.api', () => ({ listFeatureFlags: jest.fn() }));
const listMock = jest.mocked(listFeatureFlags);

describe('FeatureFlagsScreen', () => {
  beforeEach(() => listMock.mockReset());

  it('lists each flag with who it reaches, in words, and waiting requests', async () => {
    listMock.mockResolvedValue([
      flag({ key: 'codingBoard', name: 'Coding board', audience: 'off' }),
      flag({
        users: [
          {
            userId: 'u1',
            name: 'Diya',
            email: 'd@x.in',
            username: null,
            enabled: true,
            decidedAt: null,
          },
        ],
        pendingRequests: 2,
      }),
    ]);

    renderWithQuery(<FeatureFlagsScreen />);

    const board = await screen.findByRole('link', { name: /Coding board/ });
    expect(board.getAttribute('href')).toBe('/feature-flags/codingBoard');
    expect(board.textContent).toContain('Off');
    const sandbox = screen.getByRole('link', { name: /React sandbox/ });
    expect(sandbox.textContent).toContain('Selected people');
    expect(sandbox.textContent).toContain('1 person granted');
    expect(sandbox.textContent).toContain('2 requests');
  });

  it('offers a retry when the flags fail to load', async () => {
    listMock.mockRejectedValue(new Error('offline'));

    renderWithQuery(<FeatureFlagsScreen />);

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeTruthy();
  });
});
