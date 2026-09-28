import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-error';
import { register } from '../api/auth.api';
import RegisterForm from './RegisterForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../api/auth.api', () => ({
  register: jest.fn(),
  resendVerificationEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

const registerMock = jest.mocked(register);

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RegisterForm />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email: string) {
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: 'correct-horse' },
  });
  fireEvent.change(screen.getByLabelText(/^Confirm password/), {
    target: { value: 'correct-horse' },
  });
  fireEvent.click(screen.getByLabelText(/I accept the/));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  });
}

describe('RegisterForm', () => {
  beforeEach(() => registerMock.mockReset());

  it('moves focus to the first invalid field on submit', async () => {
    renderForm();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    });

    expect(document.activeElement?.id).toBe('email');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('registers and then names the address in "Check your inbox"', async () => {
    registerMock.mockResolvedValue(undefined);
    renderForm();

    await fillAndSubmit('student@example.com');

    expect(registerMock).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'correct-horse',
      acceptedTerms: true,
    });
    expect(
      await screen.findByRole('heading', { name: 'Check your inbox' }),
    ).toBeTruthy();
    expect(screen.getByText('student@example.com')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Resend in 60s/ }),
    ).toHaveProperty('disabled', true);
  });

  it("shows the API's message when the email is already registered", async () => {
    registerMock.mockRejectedValue(
      new ApiError(
        "A record with email 'student@example.com' already exists.",
        409,
      ),
    );
    renderForm();

    await fillAndSubmit('student@example.com');

    expect(
      (await screen.findAllByRole('alert')).map((node) => node.textContent),
    ).toContain("A record with email 'student@example.com' already exists.");
  });
});
