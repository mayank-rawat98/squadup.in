/** @jest-environment node */
import type { Paginated } from '@/lib/api';
import type { BoardMessage } from '../types/board.types';
import { withMessage } from './use-board-chat';

const message = (id: string): BoardMessage => ({
  id,
  body: `message ${id}`,
  createdAt: '2026-10-04T10:00:00.000Z',
  author: { id: 'u1', name: 'Diya Shah', username: 'diya', avatarUrl: null },
});

const history: Paginated<BoardMessage> = {
  data: [message('2'), message('1')],
  currentPage: 1,
  itemsPerPage: 50,
  totalItems: 2,
  totalPages: 1,
};

describe('withMessage', () => {
  it('puts a new message first, as the history is newest first', () => {
    const next = withMessage(history, message('3'));
    expect(next?.data.map((m) => m.id)).toEqual(['3', '2', '1']);
    expect(next?.totalItems).toBe(3);
  });

  it('ignores a message it already has, e.g. your own echoed back', () => {
    expect(withMessage(history, message('2'))).toBe(history);
  });

  it('waits for history to load rather than inventing a page', () => {
    expect(withMessage(undefined, message('3'))).toBeUndefined();
  });
});
