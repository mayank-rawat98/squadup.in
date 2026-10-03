'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@squadup.in/ui';
import { boardRoomPath } from '../constants/board.constant';
import type { BoardSummary } from '../types/board.types';
import { boardLanguage } from '../utils/board-language';
import {
  expiryDateTime,
  expiryLabel,
  isExpiringSoon,
} from '../utils/room-expiry';

export interface RoomListProps {
  rooms: readonly BoardSummary[];
}

/*
 * Rooms you're in, each a link back into the room with its code, whiteboard
 * and chat as they were left. Each says when it will be deleted.
 */
export default function RoomList({ rooms }: RoomListProps) {
  // One clock per render of the list, so every row agrees.
  const [now] = useState(() => new Date());

  return (
    <ul className="border-border bg-card divide-border divide-y rounded-xl border">
      {rooms.map((room) => {
        const soon = isExpiringSoon(room.expiresAt, now);
        const expiry = expiryLabel(room.expiresAt, now);
        return (
          <li key={room.code}>
            <Link
              href={boardRoomPath(room.code)}
              className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="text-body-sm min-w-0 flex-1 truncate font-medium">
                {room.name}
              </span>
              {room.role === 'host' ? (
                <Badge variant="secondary">Host</Badge>
              ) : null}
              <span className="text-muted-foreground text-caption">
                {boardLanguage(room.language).label}
              </span>
              {soon ? (
                <Badge variant="warning" title={expiryDateTime(room.expiresAt)}>
                  {expiry}
                </Badge>
              ) : (
                <span
                  className="text-muted-foreground text-caption"
                  title={expiryDateTime(room.expiresAt)}
                >
                  {expiry}
                </span>
              )}
              <span className="text-muted-foreground font-mono text-body-sm tracking-widest">
                {room.code}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
