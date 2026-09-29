'use client';

import { useSyncExternalStore } from 'react';
import {
  type SessionSnapshot,
  getSessionSnapshot,
  subscribeToSession,
} from './session-store';

/*
 * The server never knows about the session (it lives in the browser), so the
 * server snapshot is always `unknown`, which guards render as a loader.
 */
const SERVER_SNAPSHOT: SessionSnapshot = { status: 'unknown', tokens: null };
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSnapshot,
  );
}
