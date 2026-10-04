import { fireEvent, screen, waitFor } from '@testing-library/react';
import { listSandboxes } from '@/features/sandbox';
import { startRoomSandbox } from '../api/boards.api';
import { renderWithQuery } from './board.test-utils';
import StartRoomSandbox from './StartRoomSandbox';

jest.mock('../api/boards.api');
jest.mock('@/features/sandbox', () => ({
  SANDBOX_QUERY_KEYS: { list: () => ['sandboxes', 'list'] },
  createReactTsScaffold: (name: string) => ({ '/src/App.tsx': name }),
  listSandboxes: jest.fn(),
}));
const start = jest.mocked(startRoomSandbox);
const list = jest.mocked(listSandboxes);

const page = (data: { id: string; name: string }[]) => ({
  data: data.map((s) => ({ ...s, createdAt: '', updatedAt: '' })),
  currentPage: 1,
  itemsPerPage: 50,
  totalItems: data.length,
  totalPages: 1,
});

describe('StartRoomSandbox', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    start.mockResolvedValue(null);
  });

  it('starts the project from the template', async () => {
    list.mockResolvedValue(page([]));
    renderWithQuery(<StartRoomSandbox code="K7Q2M" roomName="Squad" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Start from the template' }),
    );

    await waitFor(() =>
      expect(start).toHaveBeenCalledWith('K7Q2M', {
        files: { '/src/App.tsx': 'Squad' },
      }),
    );
  });

  it('brings in the sandbox you pick', async () => {
    list.mockResolvedValue(
      page([
        { id: 'a', name: 'Todo app' },
        { id: 'b', name: 'Weather' },
      ]),
    );
    renderWithQuery(<StartRoomSandbox code="K7Q2M" roomName="Squad" />);

    fireEvent.change(
      await screen.findByLabelText('Or bring in one of your sandboxes'),
      { target: { value: 'b' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bring it in' }));

    await waitFor(() =>
      expect(start).toHaveBeenCalledWith('K7Q2M', { sandboxId: 'b' }),
    );
  });

  it('says why the project could not start', async () => {
    list.mockResolvedValue(page([]));
    start.mockRejectedValue(
      new Error(
        'Someone in this room already started a React project. Open it to join in.',
      ),
    );
    renderWithQuery(<StartRoomSandbox code="K7Q2M" roomName="Squad" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Start from the template' }),
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
