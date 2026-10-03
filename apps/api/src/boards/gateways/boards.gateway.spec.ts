import { ForbiddenException } from '@nestjs/common';
import type { JwtAppService } from '../../auth/services/jwt.service';
import type { RedisService } from '../../redis/redis.service';
import { BOARD_SOCKET_EVENTS } from '../constants/board-socket.constants';
import type { BoardChatService } from '../services/board-chat.service';
import type { BoardRoomsService } from '../services/board-rooms.service';
import type { BoardsService } from '../services/boards.service';
import { BoardsGateway } from './boards.gateway';

const author = { id: 'u1', fullName: 'Diya Shah', username: 'diya' };

function socket(token: unknown = 'good') {
  const emit = jest.fn();
  return {
    id: 's1',
    handshake: { auth: { token } },
    data: undefined as never,
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    nsp: { to: jest.fn(() => ({ emit })) },
    roomEmit: emit,
  };
}

describe('BoardsGateway', () => {
  let jwt: { verifyAccessToken: jest.Mock };
  let redis: { isDeviceBlacklisted: jest.Mock };
  let boards: { requireMember: jest.Mock };
  let chat: { post: jest.Mock };
  let rooms: { join: jest.Mock; leave: jest.Mock; applyUpdate: jest.Mock };
  let gateway: BoardsGateway;

  beforeEach(() => {
    jwt = {
      verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', did: 'd1' }),
    };
    redis = { isDeviceBlacklisted: jest.fn().mockResolvedValue(false) };
    boards = {
      requireMember: jest.fn().mockResolvedValue({ board: { id: 'b1' } }),
    };
    chat = {
      post: jest.fn(async (_b, _a, body: string) => ({
        id: 'm1',
        body,
        createdAt: new Date('2026-10-04T10:00:00Z'),
        author,
      })),
    };
    rooms = {
      join: jest.fn().mockResolvedValue({
        state: new Uint8Array([1]),
        awareness: new Uint8Array([2]),
      }),
      leave: jest.fn(),
      applyUpdate: jest.fn(),
    };
    gateway = new BoardsGateway(
      jwt as unknown as JwtAppService,
      redis as unknown as RedisService,
      boards as unknown as BoardsService,
      chat as unknown as BoardChatService,
      rooms as unknown as BoardRoomsService,
    );
  });

  const connected = async () => {
    const client = socket();
    await gateway.handleConnection(client as never);
    return client;
  };

  describe('handleConnection', () => {
    it('drops a socket without a token', async () => {
      const client = socket(null);
      await gateway.handleConnection(client as never);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('drops a socket whose token does not verify', async () => {
      jwt.verifyAccessToken.mockRejectedValue(new Error('jwt expired'));
      const client = socket();
      await gateway.handleConnection(client as never);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('drops a device that has been signed out', async () => {
      redis.isDeviceBlacklisted.mockResolvedValue(true);
      const client = socket();
      await gateway.handleConnection(client as never);
      expect(redis.isDeviceBlacklisted).toHaveBeenCalledWith('d1');
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('open', () => {
    it('joins a member to the room and hands back the doc and presence', async () => {
      const client = await connected();

      const ack = await gateway.open(client as never, { code: 'k7q2m' });

      expect(boards.requireMember).toHaveBeenCalledWith('u1', 'K7Q2M');
      expect(client.join).toHaveBeenCalledWith('board:b1');
      expect(ack).toEqual({
        ok: true,
        state: new Uint8Array([1]),
        awareness: new Uint8Array([2]),
      });
    });

    it('answers with the reason when the user is not a member', async () => {
      boards.requireMember.mockRejectedValue(
        new ForbiddenException("You're not in this room."),
      );
      const client = await connected();

      const ack = await gateway.open(client as never, { code: 'K7Q2M' });

      expect(ack).toEqual({ ok: false, message: "You're not in this room." });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('rejects a malformed code before touching the database', async () => {
      const client = await connected();

      const ack = await gateway.open(client as never, { code: 'nope' });

      expect(ack.ok).toBe(false);
      expect(boards.requireMember).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('ignores updates for a room the socket never opened', async () => {
      const client = await connected();

      gateway.update(client as never, {
        code: 'K7Q2M',
        update: new Uint8Array([1]),
      });

      expect(rooms.applyUpdate).not.toHaveBeenCalled();
    });

    it('passes binary updates for an opened room to the room', async () => {
      const client = await connected();
      await gateway.open(client as never, { code: 'K7Q2M' });

      gateway.update(client as never, {
        code: 'K7Q2M',
        update: Buffer.from([7, 8]),
      });

      expect(rooms.applyUpdate).toHaveBeenCalledWith(
        'b1',
        's1',
        new Uint8Array([7, 8]),
      );
    });
  });

  describe('sendChat', () => {
    it('stores the message and sends it to everyone in the room', async () => {
      const client = await connected();
      await gateway.open(client as never, { code: 'K7Q2M' });

      const ack = await gateway.sendChat(client as never, {
        code: 'K7Q2M',
        body: 'On it.',
      });

      expect(chat.post).toHaveBeenCalledWith('b1', 'u1', 'On it.');
      expect(client.nsp.to).toHaveBeenCalledWith('board:b1');
      expect(client.roomEmit).toHaveBeenCalledWith(
        BOARD_SOCKET_EVENTS.CHAT_MESSAGE,
        expect.objectContaining({ id: 'm1', body: 'On it.' }),
      );
      expect(ack).toMatchObject({ ok: true, message: { id: 'm1' } });
    });

    it('refuses chat for a room the socket has not opened', async () => {
      const client = await connected();

      const ack = await gateway.sendChat(client as never, {
        code: 'K7Q2M',
        body: 'hi',
      });

      expect(ack).toEqual({
        ok: false,
        message: 'Open the room before sending messages.',
      });
      expect(chat.post).not.toHaveBeenCalled();
    });

    it('slows down a burst of more than five messages', async () => {
      const client = await connected();
      await gateway.open(client as never, { code: 'K7Q2M' });

      for (let i = 0; i < 5; i++) {
        await gateway.sendChat(client as never, { code: 'K7Q2M', body: 'x' });
      }
      const sixth = await gateway.sendChat(client as never, {
        code: 'K7Q2M',
        body: 'x',
      });

      expect(sixth).toEqual({
        ok: false,
        message:
          "You're sending messages too quickly. Wait a few seconds and try again.",
      });
      expect(chat.post).toHaveBeenCalledTimes(5);
    });
  });

  it('takes the socket out of every room it opened when it disconnects', async () => {
    const client = await connected();
    await gateway.open(client as never, { code: 'K7Q2M' });

    await gateway.handleDisconnect(client as never);

    expect(rooms.leave).toHaveBeenCalledWith('b1', 's1');
  });
});
