'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Paginated } from '@/lib/api';
import { getBoardMessages } from '../api/boards.api';
import {
  BOARD_QUERY_KEYS,
  BOARD_SOCKET_EVENTS,
} from '../constants/board.constant';
import type { BoardMessage } from '../types/board.types';
import type { BoardSocket } from './use-board-connection';

type SendAck =
  | { ok: true; message: BoardMessage }
  | { ok: false; message: string };

const SEND_TIMEOUT_MS = 10_000;

/** Adds a message to the cached history (newest first), once. */
export function withMessage(
  history: Paginated<BoardMessage> | undefined,
  message: BoardMessage,
): Paginated<BoardMessage> | undefined {
  if (!history || history.data.some((m) => m.id === message.id)) {
    return history;
  }
  return {
    ...history,
    data: [message, ...history.data],
    totalItems: history.totalItems + 1,
  };
}

/*
 * A room's chat: the latest page of history from the API, then live
 * messages from the socket folded into the same cache.
 */
export function useBoardChat(
  code: string,
  socket: BoardSocket | undefined,
  live: boolean,
) {
  const queryClient = useQueryClient();
  const key = useMemo(() => BOARD_QUERY_KEYS.messages(code), [code]);
  const history = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getBoardMessages(code, signal),
  });

  useEffect(() => {
    if (!socket) return;
    const receive = (message: BoardMessage) =>
      queryClient.setQueryData<Paginated<BoardMessage>>(key, (old) =>
        withMessage(old, message),
      );
    socket.on(BOARD_SOCKET_EVENTS.chatMessage, receive);
    return () => {
      socket.off(BOARD_SOCKET_EVENTS.chatMessage, receive);
    };
  }, [socket, key, queryClient]);

  // Back from a dropped connection: fetch what was said meanwhile.
  const beenLive = useRef(false);
  useEffect(() => {
    if (!live) return;
    if (beenLive.current) void queryClient.invalidateQueries({ queryKey: key });
    beenLive.current = true;
  }, [live, key, queryClient]);

  /** Sends a message; rejects with the reason to show when it can't. */
  const send = useCallback(
    async (body: string) => {
      if (!socket || !live) {
        throw new Error("You're offline. Wait for the room to reconnect.");
      }
      let ack: SendAck;
      try {
        ack = await socket
          .timeout(SEND_TIMEOUT_MS)
          .emitWithAck(BOARD_SOCKET_EVENTS.chatSend, { code, body });
      } catch {
        throw new Error("Your message didn't send. Try again.");
      }
      if (!ack.ok) throw new Error(ack.message);
      queryClient.setQueryData<Paginated<BoardMessage>>(key, (old) =>
        withMessage(old, ack.message),
      );
    },
    [socket, live, code, key, queryClient],
  );

  return {
    /** Oldest first, for reading top to bottom. */
    messages: history.data ? [...history.data.data].reverse() : [],
    isPending: history.isPending,
    error: history.error,
    retry: () => void history.refetch(),
    send,
  };
}
