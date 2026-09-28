'use client';

import { useSyncExternalStore } from 'react';
import { getSession, subscribeToSession } from './session-store';
import type { Session } from './session.types';

/*
 * The server never knows about the session (it lives in browser storage), so
 * the server snapshot is always "signed out". Guards wait for `useHydrated`
 * before trusting a null here, which is what keeps the wrong UI from flashing.
 */

const getServerSession = (): Session | null => null;

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeToSession, getSession, getServerSession);
}

const noopSubscribe = () => () => undefined;

/** False during server render and hydration, true once running in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
