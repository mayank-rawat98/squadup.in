import { act, fireEvent, screen } from '@testing-library/react';
import { getSession } from '@/lib/auth';
import { getDevices, revokeDevice } from '../api/account.api';
import type { UserDevice } from '../types/account.types';
import DevicesCard from './DevicesCard';
import { renderWithQuery } from './account.test-utils';

jest.mock('../api/account.api', () => ({
  getDevices: jest.fn(),
  revokeDevice: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  useSession: () => getSession(),
  getSession: jest.fn(),
}));
jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const device = (patch: Partial<UserDevice>): UserDevice => ({
  deviceId: 'd',
  lastSeen: Date.now(),
  createdAt: Date.now(),
  ipMask: '10.0.*.*',
  city: 'unknown',
  country: 'unknown',
  deviceName: 'Chrome',
  deviceType: 'Desktop',
  deviceOs: 'Linux',
  ...patch,
});

describe('DevicesCard', () => {
  beforeEach(() => {
    jest.mocked(getSession).mockReturnValue({
      accessToken: 't',
      deviceId: 'this-one',
      expiresIn: 900,
      persistence: 'local',
    });
    jest
      .mocked(getDevices)
      .mockResolvedValue([
        device({ deviceId: 'this-one', deviceName: 'Firefox' }),
        device({ deviceId: 'other', deviceName: 'Safari', deviceOs: 'iOS' }),
      ]);
    jest.mocked(revokeDevice).mockReset().mockResolvedValue(undefined);
  });

  it('marks this device and lets only the others be signed out', async () => {
    renderWithQuery(<DevicesCard />);

    expect(await screen.findByText('This device')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Sign out Firefox on Linux' }),
    ).toBeNull();

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Sign out Safari on iOS' }),
      );
    });

    expect(revokeDevice).toHaveBeenCalledWith('other');
  });
});
