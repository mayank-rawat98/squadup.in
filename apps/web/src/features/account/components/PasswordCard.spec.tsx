import { act, fireEvent, screen } from '@testing-library/react';
import { changePassword, setPassword } from '../api/account.api';
import PasswordCard from './PasswordCard';
import { USER, renderWithQuery } from './account.test-utils';

jest.mock('../api/account.api', () => ({
  changePassword: jest.fn(),
  setPassword: jest.fn(),
}));
jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const changeMock = jest.mocked(changePassword);
const setMock = jest.mocked(setPassword);

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('PasswordCard', () => {
  beforeEach(() => {
    changeMock.mockReset().mockResolvedValue(undefined);
    setMock.mockReset().mockResolvedValue(undefined);
  });

  it('changes the password with the current one', async () => {
    renderWithQuery(<PasswordCard user={USER} />);

    type(/^Current password/, 'old-password');
    type(/^New password/, 'new-password-1');
    type(/^Confirm new password/, 'new-password-1');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    });

    expect(changeMock).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password-1',
    });
  });

  it('stops a mismatched confirmation before calling the API', async () => {
    renderWithQuery(<PasswordCard user={USER} />);

    type(/^Current password/, 'old-password');
    type(/^New password/, 'new-password-1');
    type(/^Confirm new password/, 'new-password-2');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
    });

    expect(await screen.findByText("The passwords don't match.")).toBeTruthy();
    expect(changeMock).not.toHaveBeenCalled();
  });

  it('offers to set a password to an account created with Google', async () => {
    renderWithQuery(<PasswordCard user={{ ...USER, isPasswordSet: false }} />);

    expect(screen.queryByLabelText(/^Current password/)).toBeNull();
    type(/^New password/, 'new-password-1');
    type(/^Confirm new password/, 'new-password-1');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Set password' }));
    });

    expect(setMock).toHaveBeenCalledWith({ newPassword: 'new-password-1' });
  });
});
