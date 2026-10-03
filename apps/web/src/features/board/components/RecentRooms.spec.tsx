import { screen } from '@testing-library/react';
import type { Paginated } from '@/lib/api';
import { listBoards } from '../api/boards.api';
import type { BoardSummary } from '../types/board.types';
import RecentRooms, { RECENT_ROOMS_LIMIT } from './RecentRooms';
import { BOARD, renderWithQuery } from './board.test-utils';

jest.mock('../api/boards.api', () => ({ listBoards: jest.fn() }));
const listMock = jest.mocked(listBoards);

const NOW = new Date('2026-10-05T09:00:00.000Z');

const room = (i: number, patch: Partial<BoardSummary> = {}): BoardSummary => ({
  ...BOARD,
  code: `ROOM${i}`,
  name: `Room ${i}`,
  ...patch,
});

function respond(rooms: BoardSummary[], totalItems = rooms.length) {
  listMock.mockResolvedValue({
    data: rooms,
    currentPage: 1,
    itemsPerPage: 20,
    totalItems,
    totalPages: 1,
  } as unknown as Paginated<BoardSummary>);
}

describe('RecentRooms', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    listMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('links each room back into the room, with when it will be deleted', async () => {
    respond([room(1)]);
    renderWithQuery(<RecentRooms />);

    const link = await screen.findByRole('link', { name: /Room 1/ });
    expect(link.getAttribute('href')).toBe('/board/ROOM1');
    // BOARD expires 2026-10-11T09:00Z: six days after NOW.
    expect(link.textContent).toContain('Deletes in 6 days');
  });

  it('flags a room with under a day left', async () => {
    respond([room(1, { expiresAt: '2026-10-05T14:00:00.000Z' })]);
    renderWithQuery(<RecentRooms />);

    expect(await screen.findByText('Deletes in 5 hours')).toBeTruthy();
  });

  it(`shows at most ${RECENT_ROOMS_LIMIT} rooms and links to the rest`, async () => {
    respond(
      Array.from({ length: 7 }, (_, i) => room(i)),
      7,
    );
    renderWithQuery(<RecentRooms />);

    await screen.findByRole('link', { name: /Room 0/ });
    expect(screen.queryByRole('link', { name: /Room 5/ })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'All 7 rooms' }).getAttribute('href'),
    ).toBe('/board');
  });

  it('offers to start a room when you have none', async () => {
    respond([]);
    renderWithQuery(<RecentRooms />);

    expect(await screen.findByText('No rooms yet')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Start a room' }).getAttribute('href'),
    ).toBe('/board');
  });

  it('says what went wrong and offers a retry when loading fails', async () => {
    listMock.mockRejectedValue(new Error('Network down'));
    renderWithQuery(<RecentRooms />);

    expect(
      await screen.findByRole('button', { name: 'Try again' }),
    ).toBeTruthy();
  });
});
