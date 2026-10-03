'use client';

import { useEffect, useRef } from 'react';
import { sandboxChannelName } from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';

/*
 * "Open preview in a new tab" keeps that tab in step with the editor
 * without a server round trip: the editor tab posts the project on every
 * change over a BroadcastChannel (same origin, same browser), and a preview
 * that opens asks for the current files straight away. Without the editor
 * open, the preview shows the last saved version.
 */

type ChannelMessage =
  | { type: 'files'; files: SandboxFiles }
  | { type: 'request' };

function openChannel(id: string): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined'
    ? null
    : new BroadcastChannel(sandboxChannelName(id));
}

/** The editor side: publishes `files` as they change. */
export function usePublishFiles(id: string, files: SandboxFiles): void {
  const channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef(files);
  latest.current = files;

  useEffect(() => {
    const opened = openChannel(id);
    if (!opened) return;
    channel.current = opened;
    opened.onmessage = (event: MessageEvent<ChannelMessage>) => {
      if (event.data?.type === 'request') {
        opened.postMessage({ type: 'files', files: latest.current });
      }
    };
    return () => {
      channel.current = null;
      opened.close();
    };
  }, [id]);

  useEffect(() => {
    channel.current?.postMessage({ type: 'files', files });
  }, [files]);
}

/** The preview side: calls `onFiles` with each version the editor posts. */
export function useSubscribeFiles(
  id: string,
  onFiles: (files: SandboxFiles) => void,
): void {
  const handler = useRef(onFiles);
  handler.current = onFiles;

  useEffect(() => {
    const opened = openChannel(id);
    if (!opened) return;
    opened.onmessage = (event: MessageEvent<ChannelMessage>) => {
      if (event.data?.type === 'files') handler.current(event.data.files);
    };
    opened.postMessage({ type: 'request' });
    return () => opened.close();
  }, [id]);
}
