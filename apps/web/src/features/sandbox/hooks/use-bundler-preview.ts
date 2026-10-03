'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import {
  type ClientOptions,
  type SandboxSetup,
  type SandpackClient,
  type SandpackMessage,
  loadSandpackClient,
} from '@codesandbox/sandpack-client';
import { SANDBOX_ENTRY } from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';
import {
  type ConsoleLine,
  appendConsoleLines,
  formatConsoleArgs,
  toConsoleMethod,
} from '../utils/console-format';

/** How long after an edit the preview recompiles. */
export const PREVIEW_RECOMPILE_DELAY_MS = 300;
/** Past this, a preview that hasn't run yet says it's taking too long. */
export const PREVIEW_START_TIMEOUT_MS = 60_000;

export type PreviewState = 'starting' | 'running' | 'timeout';

export interface BundlerPreview {
  iframe: RefObject<HTMLIFrameElement | null>;
  state: PreviewState;
  logs: ConsoleLine[];
  clearLogs: () => void;
  /** Reloads the running app, as the browser's reload would. */
  refresh: () => void;
  /** Starts the preview over, e.g. after it timed out. */
  restart: () => void;
}

const CLIENT_OPTIONS: ClientOptions = {
  showOpenInCodeSandbox: false,
  // Compile and runtime errors show inside the preview.
  showErrorScreen: true,
  showLoadingScreen: false,
};

/**
 * How Sandpack's in-browser bundler runs the project: from SANDBOX_ENTRY,
 * as index.html's module script names it for Vite, with the React refresh
 * and JSX handling of its React environment.
 */
export function toSandboxSetup(files: SandboxFiles): SandboxSetup {
  return {
    files: Object.fromEntries(
      Object.entries(files).map(([path, code]) => [path, { code }]),
    ),
    entry: SANDBOX_ENTRY,
    template: 'create-react-app',
  };
}

let nextLineId = 0;

/*
 * Drives Sandpack's bundler in an iframe straight through sandpack-client,
 * instead of through <SandpackPreview>. That component registers its client
 * from an effect without cancelling the first one, so React's StrictMode
 * double mount (in development) leaves two clients on one iframe and edits
 * stop reaching the preview. Here a cancelled start throws its client away.
 */
export function useBundlerPreview(files: SandboxFiles): BundlerPreview {
  const iframe = useRef<HTMLIFrameElement>(null);
  const client = useRef<SandpackClient | null>(null);
  const latest = useRef(files);
  latest.current = files;
  const [state, setState] = useState<PreviewState>('starting');
  const [logs, setLogs] = useState<ConsoleLine[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = iframe.current;
    if (!element) return;
    let cancelled = false;
    let started: SandpackClient | null = null;
    let unsubscribe: (() => void) | null = null;
    setState('starting');
    const timeout = setTimeout(() => {
      setState((current) => (current === 'starting' ? 'timeout' : current));
    }, PREVIEW_START_TIMEOUT_MS);

    const onMessage = (message: SandpackMessage) => {
      if (message.type === 'done') {
        clearTimeout(timeout);
        setState('running');
      }
      if (message.type === 'console' && 'log' in message) {
        const entries = Array.isArray(message.log)
          ? message.log
          : [message.log];
        if (entries.some((entry) => entry.method === 'clear')) {
          setLogs([]);
          return;
        }
        setLogs((current) =>
          appendConsoleLines(
            current,
            entries.map((entry) => ({
              id: String(nextLineId++),
              method: toConsoleMethod(entry.method),
              text: formatConsoleArgs(entry.data ?? []),
            })),
          ),
        );
      }
    };

    const initial = latest.current;
    loadSandpackClient(element, toSandboxSetup(initial), CLIENT_OPTIONS)
      .then((loaded) => {
        if (cancelled) {
          loaded.destroy();
          return;
        }
        started = loaded;
        client.current = loaded;
        unsubscribe = loaded.listen(onMessage);
        // Edits made while the client loaded had nowhere to go yet.
        if (latest.current !== initial) {
          loaded.updateSandbox(toSandboxSetup(latest.current));
        }
      })
      .catch(() => {
        if (!cancelled) setState('timeout');
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsubscribe?.();
      started?.destroy();
      if (client.current === started) client.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        client.current?.updateSandbox(toSandboxSetup(files));
      } catch {
        // The bundler re-reads package.json on every update; until it is
        // valid JSON again, the preview keeps the last version that ran.
      }
    }, PREVIEW_RECOMPILE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [files]);

  return {
    iframe,
    state,
    logs,
    clearLogs: () => setLogs([]),
    refresh: () => {
      setLogs([]);
      client.current?.dispatch({ type: 'refresh' });
    },
    restart: () => setAttempt((n) => n + 1),
  };
}
