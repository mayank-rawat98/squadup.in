import { act, fireEvent, screen } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { joinBoard } from '../api/boards.api';
import JoinRoomCard from './JoinRoomCard';
import { BOARD, renderWithQuery } from './board.test-utils';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('../api/boards.api', () => ({ joinBoard: jest.fn() }));

const joinMock = jest.mocked(joinBoard);

function paste(text: string) {
  fireEvent.paste(screen.getByLabelText('Room ID'), {
    clipboardData: {
      getData: (format: string) => (format === 'text/plain' ? text : ''),
    },
  });
}

const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Join room' }));
  });

describe('JoinRoomCard', () => {
  beforeEach(() => {
    push.mockReset();
    joinMock.mockReset().mockResolvedValue(BOARD);
  });

  it('joins with the code upper-cased and opens the room', async () => {
    renderWithQuery(<JoinRoomCard />);

    paste('k7q2m');
    await submit();

    expect(joinMock).toHaveBeenCalledWith('K7Q2M');
    expect(push).toHaveBeenCalledWith('/board/K7Q2M');
  });

  it('explains a short code without calling the API', async () => {
    renderWithQuery(<JoinRoomCard />);

    paste('K7Q');
    await submit();

    expect(joinMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Room IDs have 5 letters and numbers. Check the ID and try again.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Room ID').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it("shows the server's reason when the room can't be joined", async () => {
    joinMock.mockRejectedValue(
      new ApiError('This room is full: all 8 seats are taken.', 409),
    );
    renderWithQuery(<JoinRoomCard />);

    paste('K7Q2M');
    await submit();

    expect(
      screen.getByText('This room is full: all 8 seats are taken.'),
    ).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
