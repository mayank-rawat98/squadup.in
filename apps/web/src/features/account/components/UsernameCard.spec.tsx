import { act, fireEvent, screen } from '@testing-library/react';
import { checkUsername, updateProfile } from '../api/account.api';
import UsernameCard from './UsernameCard';
import { USER, renderWithQuery } from './account.test-utils';

jest.mock('../api/account.api', () => ({
  checkUsername: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('@squadup.in/ui', () => ({
  ...jest.requireActual('@squadup.in/ui'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const checkMock = jest.mocked(checkUsername);
const updateMock = jest.mocked(updateProfile);

function typeUsername(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /^Username/ }), {
    target: { value },
  });
}

describe('UsernameCard', () => {
  beforeEach(() => {
    checkMock.mockReset();
    updateMock.mockReset().mockResolvedValue(undefined);
  });

  it('checks a valid name after a pause and saves it lowercased', async () => {
    checkMock.mockResolvedValue({
      username: 'asha_v',
      available: true,
      reason: null,
    });
    renderWithQuery(<UsernameCard user={USER} />);

    typeUsername('Asha_V');

    expect(await screen.findByText('@asha_v is available.')).toBeTruthy();
    expect(checkMock).toHaveBeenCalledWith('asha_v', expect.anything());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save username' }));
    });
    expect(updateMock).toHaveBeenCalledWith({ username: 'asha_v' });
  });

  it('says when a name is taken and blocks saving', async () => {
    checkMock.mockResolvedValue({
      username: 'taken_name',
      available: false,
      reason: 'taken',
    });
    renderWithQuery(<UsernameCard user={USER} />);

    typeUsername('taken_name');

    expect(
      await screen.findByText('Someone already has that username.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Save username' }),
    ).toHaveProperty('disabled', true);
  });

  it('does not ask the API about a name that breaks the rules', async () => {
    renderWithQuery(<UsernameCard user={USER} />);

    typeUsername('9lives');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    expect(checkMock).not.toHaveBeenCalled();
  });

  it('links to the public profile once a username is set', () => {
    renderWithQuery(<UsernameCard user={{ ...USER, username: 'asha_v' }} />);

    expect(
      screen
        .getByRole('link', { name: /View your public profile/ })
        .getAttribute('href'),
    ).toBe('/u/asha_v');
  });
});
