import { act, fireEvent, screen } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { createSandbox } from '../api/sandboxes.api';
import CreateSandboxCard from './CreateSandboxCard';
import { SANDBOX, renderWithQuery } from './sandbox.test-utils';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('../api/sandboxes.api', () => ({ createSandbox: jest.fn() }));

const createMock = jest.mocked(createSandbox);

const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create sandbox' }));
  });

describe('CreateSandboxCard', () => {
  beforeEach(() => {
    push.mockReset();
    createMock.mockReset().mockResolvedValue(SANDBOX);
  });

  it('saves the scaffold under the name and opens the sandbox', async () => {
    renderWithQuery(<CreateSandboxCard />);

    fireEvent.change(screen.getByLabelText(/^Sandbox name/), {
      target: { value: '  Todo app ' },
    });
    await submit();

    const input = createMock.mock.calls[0][0];
    expect(input.name).toBe('Todo app');
    expect(Object.keys(input.files)).toEqual(
      expect.arrayContaining([
        '/src/App.tsx',
        '/src/main.tsx',
        '/package.json',
      ]),
    );
    expect(JSON.parse(input.files['/package.json']).name).toBe('todo-app');
    expect(push).toHaveBeenCalledWith(`/sandbox/${SANDBOX.id}`);
  });

  it('asks for a name before creating', async () => {
    renderWithQuery(<CreateSandboxCard />);

    await submit();

    expect(createMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('Give the sandbox a name so you can find it later.'),
    ).toBeTruthy();
  });

  it("shows the API's message when creating fails", async () => {
    createMock.mockRejectedValue(
      new ApiError(
        'You have 50 sandboxes, the most you can keep. Delete one to start another.',
        409,
      ),
    );
    renderWithQuery(<CreateSandboxCard />);

    fireEvent.change(screen.getByLabelText(/^Sandbox name/), {
      target: { value: 'One more' },
    });
    await submit();

    expect(
      screen.getByText(
        'You have 50 sandboxes, the most you can keep. Delete one to start another.',
      ),
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
