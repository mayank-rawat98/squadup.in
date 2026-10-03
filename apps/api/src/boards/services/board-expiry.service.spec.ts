import { BOARD_EXPIRY_BATCH_SIZE } from '../constants/board.constants';
import { BoardsRepository } from '../repositories/boards.repository';
import { BoardExpiryService } from './board-expiry.service';
import { BoardRoomsService } from './board-rooms.service';

const NOW = new Date('2026-10-11T10:00:00Z');

const ids = (count: number, from = 0) =>
  Array.from({ length: count }, (_, i) => `b${from + i}`);

describe('BoardExpiryService', () => {
  let boards: jest.Mocked<
    Pick<BoardsRepository, 'findExpiredIds' | 'deleteByIds'>
  >;
  let rooms: jest.Mocked<Pick<BoardRoomsService, 'evict'>>;
  let service: BoardExpiryService;

  beforeEach(() => {
    boards = {
      findExpiredIds: jest.fn().mockResolvedValue([]),
      deleteByIds: jest.fn().mockResolvedValue(undefined),
    };
    rooms = { evict: jest.fn().mockResolvedValue(undefined) };
    service = new BoardExpiryService(
      boards as unknown as BoardsRepository,
      rooms as unknown as BoardRoomsService,
    );
  });

  it('closes each expired room before deleting it', async () => {
    const order: string[] = [];
    boards.findExpiredIds.mockResolvedValueOnce(['b1', 'b2']);
    rooms.evict.mockImplementation(async (id) => {
      order.push(`evict ${id}`);
    });
    boards.deleteByIds.mockImplementation(async (deleted) => {
      order.push(`delete ${deleted.join(',')}`);
    });

    const deleted = await service.deleteExpired(NOW);

    expect(deleted).toBe(2);
    expect(boards.findExpiredIds).toHaveBeenCalledWith(
      NOW,
      BOARD_EXPIRY_BATCH_SIZE,
    );
    expect(order).toEqual(['evict b1', 'evict b2', 'delete b1,b2']);
  });

  it('keeps going while full batches come back', async () => {
    boards.findExpiredIds
      .mockResolvedValueOnce(ids(BOARD_EXPIRY_BATCH_SIZE))
      .mockResolvedValueOnce(ids(3, BOARD_EXPIRY_BATCH_SIZE));

    const deleted = await service.deleteExpired(NOW);

    expect(deleted).toBe(BOARD_EXPIRY_BATCH_SIZE + 3);
    expect(boards.findExpiredIds).toHaveBeenCalledTimes(2);
    expect(boards.deleteByIds).toHaveBeenCalledTimes(2);
  });

  it('deletes nothing when no room has expired', async () => {
    const deleted = await service.deleteExpired(NOW);

    expect(deleted).toBe(0);
    expect(rooms.evict).not.toHaveBeenCalled();
    expect(boards.deleteByIds).not.toHaveBeenCalled();
  });

  it('logs a failed sweep instead of throwing, so the next hour retries', async () => {
    boards.findExpiredIds.mockRejectedValue(new Error('connection lost'));

    await expect(service.sweep()).resolves.toBeUndefined();
  });
});
