'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

/** Which part of the board someone is looking at. */
export type BoardView = 'code' | 'board';

/** What each client publishes about itself in awareness. */
export interface PresenceState {
  user: {
    id: string;
    name: string;
    /** CSS colours, read by y-codemirror for carets and selections. */
    color: string;
    colorLight: string;
  };
  view: BoardView;
  /** 1-based line of the caret in the open file, when known. */
  line?: number;
  /** True while drawing on the whiteboard. */
  drawing?: boolean;
  /** True while writing a chat message. */
  typing?: boolean;
}

export interface Peer extends PresenceState {
  clientId: number;
}

function isPresence(state: unknown): state is PresenceState {
  const user = (state as PresenceState | null)?.user;
  return typeof user?.id === 'string' && typeof user.name === 'string';
}

/** Everyone else in the room right now, one entry per open tab. */
export function usePeers(awareness: Awareness | undefined): Peer[] {
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    if (!awareness) return;
    const read = () =>
      setPeers(
        [...awareness.getStates()]
          .filter(([clientId]) => clientId !== awareness.clientID)
          .flatMap(([clientId, state]) =>
            isPresence(state) ? [{ ...state, clientId }] : [],
          ),
      );
    read();
    awareness.on('change', read);
    return () => awareness.off('change', read);
  }, [awareness]);

  return peers;
}

/** Publishes this tab's presence and keeps the given fields current. */
export function useLocalPresence(
  awareness: Awareness | undefined,
  presence: PresenceState | null,
): void {
  const key = presence ? JSON.stringify(presence) : null;

  useEffect(() => {
    if (!awareness || !key) return;
    const next = JSON.parse(key) as PresenceState;
    const current = (awareness.getLocalState() ?? {}) as Record<
      string,
      unknown
    >;
    // Keep fields other code owns, such as the editor's `cursor`.
    awareness.setLocalState({ ...current, ...next });
  }, [awareness, key]);
}
