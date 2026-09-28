import { act, fireEvent, screen } from '@testing-library/react';
import {
  confirmEmailChange,
  getPendingEmailChange,
  requestEmailChange,
} from '../api/account.api';
import EmailChangeCard from './EmailChangeCard';
import { USER, renderWithQuery } from './account.test-utils';

jest.mock('../api/account.api', () => ({
  cancelEmailChange: jest.fn(),
  confirmEmailChange: jest.fn(),
  getPendingEmailChange: jest.fn(),
  requestEmailChange: jest.fn(),
  sendEmailChangePreauthCode: jest.fn(),
}));
jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const pendingMock = jest.mocked(getPendingEmailChange);
const PENDING = {
  newEmail: 'new@example.com',
  expiresAt: '2026-09-28T12:10:00.000Z',
  attemptsRemaining: 5,
};

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/* jsdom has no layout; the code input asks it where the caret is on focus. */
beforeAll(() => {
  document.elementFromPoint = () => null;
});

describe('EmailChangeCard', () => {
  beforeEach(() => {
    pendingMock.mockReset().mockResolvedValue(null);
    jest.mocked(requestEmailChange).mockReset().mockResolvedValue(undefined);
    jest
      .mocked(confirmEmailChange)
      .mockReset()
      .mockResolvedValue('new@example.com');
  });

  it('asks for the password and, when on, the authenticator code', async () => {
    const user = {
      ...USER,
      settings: {
        twoFactor: {
          authenticator: { enabled: true, preference: 1 },
          email: { enabled: false, preference: 2 },
          phone: { enabled: false, preference: 3 },
          passkey: { enabled: false, preference: 4 },
        },
      },
    };
    renderWithQuery(<EmailChangeCard user={user} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Change email' }),
    );
    type(/^New email/, 'new@example.com');
    type(/^Your password/, 'secret-password');
    type(/^Authenticator code/, '123456');
    pendingMock.mockResolvedValue(PENDING);
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Send code to new email' }),
      );
    });

    expect(requestEmailChange).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
      password: 'secret-password',
      totp: '123456',
    });
    expect(
      await screen.findByRole('button', { name: 'Confirm new email' }),
    ).toBeTruthy();
  });

  it('uses a code from the current email for an account without a password', async () => {
    renderWithQuery(
      <EmailChangeCard user={{ ...USER, isPasswordSet: false }} />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Change email' }),
    );

    expect(screen.queryByLabelText(/^Your password/)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Email me a code' }),
    ).toBeTruthy();
    type(/^New email/, 'new@example.com');
    type(/^Code sent to asha@example.com/, '654321');
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Send code to new email' }),
      );
    });

    expect(requestEmailChange).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
      preauthOtp: '654321',
    });
  });

  it('resumes an unfinished change at the code step', async () => {
    pendingMock.mockResolvedValue(PENDING);
    renderWithQuery(<EmailChangeCard user={USER} />);

    expect(await screen.findByText(/We sent a code to/)).toBeTruthy();
    expect(screen.getByText('new@example.com')).toBeTruthy();
  });
});
