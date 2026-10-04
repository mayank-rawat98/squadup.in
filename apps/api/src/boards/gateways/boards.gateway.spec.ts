import { ForbiddenException } from '@nestjs/common';
import type { JwtAppService } from '../../auth/services/jwt.service';
import type { FeatureFlagsService } from '../../feature-flags/services/feature-flags.service';
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
  let featureFlags: { assertFeatureAccess: jest.Mock };
  let rooms: {
    join: jest.Mock;
    leave: jest.Mock;
    applyUpdate: jest.Mock;
    setBroadcast: jest.Mock;
  };
  let gateway: BoardsGateway;

  beforeEach(() => {
    jwt = {
      verifyAccessToken: jest.fn().mockResolvedValue({ sub: 'u1', did: 'd1' }),
    };
    redis = { isDeviceBlacklisted: jest.fn().mockResolvedValue(false) };
    featureFlags = {
      assertFeatureAccess: jest.fn().mockResolvedValue(undefined),
    };
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
      setBroadcast: jest.fn(),
    };
    gateway = new BoardsGateway(
      jwt as unknown as JwtAppService,
      redis as unknown as RedisService,
      boards as unknown as BoardsService,
      chat as unknown as BoardChatService,
      rooms as unknown as BoardRoomsService,
      featureFlags as unknown as FeatureFlagsService,
    );
  });

  const connected = async () => {
    const client = socket();
    await gateway.authenticate(client as never);
    return client;
  };

  describe('authenticate', () => {
    it('refuses a socket without a token', async () => {
      await expect(
        gateway.authenticate(socket(null) as never),
      ).rejects.toThrow();
    });

    it('refuses a socket whose token does not verify', async () => {
      jwt.verifyAccessToken.mockRejectedValue(new Error('jwt expired'));
      await expect(gateway.authenticate(socket() as never)).rejects.toThrow();
    });

    it('refuses a device that has been signed out', async () => {
      redis.isDeviceBlacklisted.mockResolvedValue(true);
      await expect(gateway.authenticate(socket() as never)).rejects.toThrow();
      expect(redis.isDeviceBlacklisted).toHaveBeenCalledWith('d1');
    });

    it('runs as middleware, so no message arrives before the user is known', async () => {
      const use = jest.fn();
      gateway.afterInit({ use, to: jest.fn() } as never);
      const middleware = use.mock.calls[0][0];

      const accepted = socket();
      await new Promise<void>((resolve) =>
        middleware(accepted, (error?: Error) => {
          expect(error).toBeUndefined();
          resolve();
        }),
      );
      expect(accepted.data).toMatchObject({ userId: 'u1' });

      jwt.verifyAccessToken.mockRejectedValue(new Error('jwt expired'));
      await new Promise<void>((resolve) =>
        middleware(socket(), (error?: Error) => {
          expect(error?.message).toBe('Sign in again to open this room.');
          resolve();
        }),
      );
    });
  });

  describe('open', () => {
    it('joins a member to the room and hands back the doc and presence', async () => {
      const client = await connected();

      const ack = await gateway.open(client as never, { code: 'k7q2m' });

      expect(featureFlags.assertFeatureAccess).toHaveBeenCalledWith(
        'u1',
        'codingBoard',
      );
      expect(boards.requireMember).toHaveBeenCalledWith('u1', 'K7Q2M');
      expect(client.join).toHaveBeenCalledWith('board:b1');
      expect(rooms.join).toHaveBeenCalledWith('code', { id: 'b1' }, 's1');
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

    it('refuses someone the coding board flag does not reach', async () => {
      featureFlags.assertFeatureAccess.mockRejectedValue(
        new ForbiddenException(
          'This experimental feature is not enabled for your account.',
        ),
      );
      const client = await connected();

      const ack = await gateway.open(client as never, { code: 'K7Q2M' });

      expect(ack).toEqual({
        ok: false,
        message: 'This experimental feature is not enabled for your account.',
      });
      expect(boards.requireMember).not.toHaveBeenCalled();
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
        'code',
        'b1',
        's1',
        new Uint8Array([7, 8]),
      );
    });
  });

  describe('the React project', () => {
    it('opens it for someone both flags reach, in its own socket room', async () => {
      const client = await connected();

      const ack = await gateway.openSandbox(client as never, { code: 'K7Q2M' });

      expect(featureFlags.assertFeatureAccess.mock.calls).toEqual([
        ['u1', 'codingBoard'],
        ['u1', 'reactSandbox'],
      ]);
      expect(client.join).toHaveBeenCalledWith('board:b1:sandbox');
      expect(rooms.join).toHaveBeenCalledWith('sandbox', { id: 'b1' }, 's1');
      expect(ack).toEqual({
        ok: true,
        ready: true,
        state: new Uint8Array([1]),
        awareness: new Uint8Array([2]),
      });
    });

    it('says it is not ready, and keeps the socket out, before anyone starts it', async () => {
      rooms.join.mockResolvedValue(null);
      const client = await connected();

      const ack = await gateway.openSandbox(client as never, { code: 'K7Q2M' });

      expect(ack).toEqual({ ok: true, ready: false });
      expect(client.leave).toHaveBeenCalledWith('board:b1:sandbox');
      gateway.sandboxUpdate(client as never, {
        code: 'K7Q2M',
        update: Buffer.from([1]),
      });
      expect(rooms.applyUpdate).not.toHaveBeenCalled();
    });

    it('refuses someone the React sandbox flag does not reach', async () => {
      featureFlags.assertFeatureAccess.mockImplementation(
        async (_user: string, key: string) => {
          if (key === 'reactSandbox') {
            throw new ForbiddenException(
              'This experimental feature is not enabled for your account.',
            );
          }
        },
      );
      const client = await connected();

      const ack = await gateway.openSandbox(client as never, { code: 'K7Q2M' });

      expect(ack.ok).toBe(false);
      expect(rooms.join).not.toHaveBeenCalled();
    });

    it('does not let an opened code document carry project edits', async () => {
      const client = await connected();
      await gateway.open(client as never, { code: 'K7Q2M' });

      gateway.sandboxUpdate(client as never, {
        code: 'K7Q2M',
        update: Buffer.from([1]),
      });

      expect(rooms.applyUpdate).not.toHaveBeenCalled();
    });

    it('passes project edits to the project once it is open', async () => {
      const client = await connected();
      await gateway.openSandbox(client as never, { code: 'K7Q2M' });

      gateway.sandboxUpdate(client as never, {
        code: 'K7Q2M',
        update: Buffer.from([7]),
      });

      expect(rooms.applyUpdate).toHaveBeenCalledWith(
        'sandbox',
        'b1',
        's1',
        new Uint8Array([7]),
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

  it('takes the socket out of every document it opened when it disconnects', async () => {
    const client = await connected();
    await gateway.open(client as never, { code: 'K7Q2M' });
    await gateway.openSandbox(client as never, { code: 'K7Q2M' });

    await gateway.handleDisconnect(client as never);

    expect(rooms.leave).toHaveBeenCalledWith('code', 'b1', 's1');
    expect(rooms.leave).toHaveBeenCalledWith('sandbox', 'b1', 's1');
  });
});
