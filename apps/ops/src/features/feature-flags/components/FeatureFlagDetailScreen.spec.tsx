import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  approveRequest,
  getFeatureFlag,
  listPendingRequests,
  rejectRequest,
  removeUserAccess,
  searchUsers,
  setUserAccess,
  updateFeatureFlag,
} from '../api/feature-flags.api';
import type { FeatureFlagUser } from '../types/feature-flag.types';
import FeatureFlagDetailScreen from './FeatureFlagDetailScreen';
import { flag, renderWithQuery } from './feature-flags.test-utils';

jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('../api/feature-flags.api');
const get = jest.mocked(getFeatureFlag);
const update = jest.mocked(updateFeatureFlag);
const setAccess = jest.mocked(setUserAccess);
const remove = jest.mocked(removeUserAccess);
const search = jest.mocked(searchUsers);
const pending = jest.mocked(listPendingRequests);
const approve = jest.mocked(approveRequest);
const reject = jest.mocked(rejectRequest);

const DIYA: FeatureFlagUser = {
  userId: 'u1',
  name: 'Diya Shah',
  email: 'diya@x.in',
  username: 'diya',
  enabled: true,
  decidedAt: '2026-10-04T10:00:00.000Z',
};

describe('FeatureFlagDetailScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    get.mockResolvedValue(flag());
    pending.mockResolvedValue([]);
  });

  it('opens a flag to everyone only when saved', async () => {
    update.mockResolvedValue(
      flag({ audience: 'everyone', rolloutToAll: true }),
    );
    renderWithQuery(<FeatureFlagDetailScreen featureKey="reactSandbox" />);

    const save = await screen.findByRole('button', { name: 'Save changes' });
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Everyone' }));
    fireEvent.click(save);

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('reactSandbox', {
        enabled: true,
        rolloutToAll: true,
      }),
    );
  });

  it('switches a flag off for everyone', async () => {
    update.mockResolvedValue(flag({ audience: 'off', enabled: false }));
    renderWithQuery(<FeatureFlagDetailScreen featureKey="reactSandbox" />);

    fireEvent.click(
      await screen.findByRole('radio', { name: 'Off for everyone' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('reactSandbox', {
        enabled: false,
        rolloutToAll: false,
      }),
    );
  });

  it('finds a person by name or email and grants them access', async () => {
    search.mockResolvedValue([
      { id: 'u2', fullName: 'Kabir Mehta', email: 'kabir@x.in' },
    ]);
    setAccess.mockResolvedValue(flag());
    renderWithQuery(<FeatureFlagDetailScreen featureKey="reactSandbox" />);

    fireEvent.change(await screen.findByLabelText('Add a person'), {
      target: { value: 'kab' },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Grant Kabir Mehta' }),
    );

    await waitFor(() =>
      expect(setAccess).toHaveBeenCalledWith('reactSandbox', 'u2', true),
    );
    expect(search).toHaveBeenCalledWith('kab', expect.anything());
  });

  it('lists people with their access in words, and can deny or remove them', async () => {
    get.mockResolvedValue(flag({ users: [DIYA] }));
    setAccess.mockResolvedValue(flag({ users: [{ ...DIYA, enabled: false }] }));
    remove.mockResolvedValue(flag());
    renderWithQuery(<FeatureFlagDetailScreen featureKey="reactSandbox" />);

    const people = () =>
      screen.getByRole('list', { name: 'People with their own access' });
    expect(
      within(
        await screen.findByRole('list', {
          name: 'People with their own access',
        }),
      ).getByText('Granted'),
    ).toBeTruthy();

    fireEvent.click(
      within(people()).getByRole('button', { name: 'Deny Diya Shah' }),
    );
    await waitFor(() =>
      expect(setAccess).toHaveBeenCalledWith('reactSandbox', 'u1', false),
    );
    expect(await within(people()).findByText('Denied')).toBeTruthy();

    fireEvent.click(
      within(people()).getByRole('button', { name: 'Remove Diya Shah' }),
    );
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith('reactSandbox', 'u1'),
    );
  });

  it('approves a request, or rejects it with the reason they will see', async () => {
    pending.mockResolvedValue([
      {
        id: 'r1',
        userId: 'u3',
        userName: 'Meera Iyer',
        userEmail: 'meera@x.in',
        featureKey: 'reactSandbox',
        featureName: 'React sandbox',
        status: 'PENDING',
        requestMessage: 'For our hackathon',
        requestedAt: '2026-10-04T09:00:00.000Z',
      },
    ]);
    approve.mockResolvedValue({});
    reject.mockResolvedValue({});
    renderWithQuery(<FeatureFlagDetailScreen featureKey="reactSandbox" />);

    expect(await screen.findByText('“For our hackathon”')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Approve Meera Iyer' }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith('r1'));

    fireEvent.change(
      screen.getByLabelText('Reason for rejecting Meera Iyer, shown to them'),
      { target: { value: 'Full this week' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reject Meera Iyer' }));
    await waitFor(() =>
      expect(reject).toHaveBeenCalledWith('r1', 'Full this week'),
    );
  });

  it('says when the key matches no flag', async () => {
    const { ApiError } = jest.requireActual('@/lib/api/api-error');
    get.mockRejectedValue(new ApiError('Feature flag "nope" not found', 404));

    renderWithQuery(<FeatureFlagDetailScreen featureKey="nope" />);

    expect(
      await screen.findByRole('heading', {
        name: 'There is no flag with this key',
      }),
    ).toBeTruthy();
  });
});
