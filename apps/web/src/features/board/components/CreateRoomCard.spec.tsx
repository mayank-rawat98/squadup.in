import { act, fireEvent, screen } from '@testing-library/react';
import { createBoard } from '../api/boards.api';
import CreateRoomCard from './CreateRoomCard';
import { BOARD, renderWithQuery } from './board.test-utils';

jest.mock('../api/boards.api', () => ({ createBoard: jest.fn() }));

const createMock = jest.mocked(createBoard);

describe('CreateRoomCard', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ ...BOARD, role: 'host' });
  });

  it('creates the room and shows its ID with a link to open it', async () => {
    renderWithQuery(<CreateRoomCard />);

    fireEvent.change(screen.getByLabelText(/^Room name/), {
      target: { value: 'Two-sum warmup' },
    });
    fireEvent.change(screen.getByLabelText('Starting language'), {
      target: { value: 'python' },
    });
    fireEvent.change(screen.getByLabelText('Seats'), {
      target: { value: '4' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    });

    expect(createMock.mock.calls[0][0]).toEqual({
      name: 'Two-sum warmup',
      language: 'python',
      seats: 4,
    });
    expect(screen.getByText('K7Q2M')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open the room' }).getAttribute('href'),
    ).toBe('/board/K7Q2M');
  });

  it('asks for a name before creating', async () => {
    renderWithQuery(<CreateRoomCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create room' }));
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('Give the room a name so your squad recognises it.'),
    ).toBeTruthy();
  });
});
