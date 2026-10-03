import { BadRequestException } from '@nestjs/common';
import { BoardMessagesRepository } from '../repositories/board-messages.repository';
import { BoardChatService } from './board-chat.service';

describe('BoardChatService', () => {
  let repo: jest.Mocked<Pick<BoardMessagesRepository, 'create' | 'listPage'>>;
  let service: BoardChatService;

  beforeEach(() => {
    repo = {
      create: jest.fn(async (boardId, authorId, body) => ({
        id: 'msg1',
        boardId,
        authorId,
        body,
      })) as never,
      listPage: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    service = new BoardChatService(repo as unknown as BoardMessagesRepository);
  });

  it('stores the trimmed message', async () => {
    await service.post('b1', 'u1', '  On it.  ');

    expect(repo.create).toHaveBeenCalledWith('b1', 'u1', 'On it.');
  });

  it.each([[''], ['   '], [undefined], [42]])(
    'refuses an empty or non-text message (%p)',
    async (body) => {
      await expect(service.post('b1', 'u1', body)).rejects.toThrow(
        new BadRequestException('Type a message before sending.'),
      );
      expect(repo.create).not.toHaveBeenCalled();
    },
  );

  it('refuses a message over 2000 characters', async () => {
    await expect(service.post('b1', 'u1', 'a'.repeat(2001))).rejects.toThrow(
      new BadRequestException('Messages can be up to 2000 characters.'),
    );
  });

  it('accepts exactly 2000 characters', async () => {
    await service.post('b1', 'u1', 'a'.repeat(2000));

    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('pages history 50 at a time by default', async () => {
    await service.history('b1', {});

    expect(repo.listPage).toHaveBeenCalledWith('b1', 1, 50);
  });
});
