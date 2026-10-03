'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Spinner,
  Typography,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { listBoards } from '../api/boards.api';
import { BOARD_QUERY_KEYS, boardRoomPath } from '../constants/board.constant';
import { boardLanguage } from '../utils/board-language';

export default function YourRooms() {
  const rooms = useQuery({
    queryKey: BOARD_QUERY_KEYS.list(),
    queryFn: ({ signal }) => listBoards(signal),
  });

  return (
    <section
      aria-labelledby="your-rooms-heading"
      className="flex flex-col gap-4"
    >
      <Typography as="h2" variant="h4" id="your-rooms-heading">
        Your rooms
      </Typography>

      {rooms.isPending ? (
        <Spinner label="Loading your rooms" />
      ) : rooms.isError ? (
        <Alert tone="danger">
          <p>{getErrorMessage(rooms.error)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void rooms.refetch()}
          >
            Try again
          </Button>
        </Alert>
      ) : rooms.data.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No rooms yet"
          description="Rooms you start or join show up here, so you can get back to them."
        />
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-xl border">
          {rooms.data.data.map((room) => (
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
                <span className="text-muted-foreground font-mono text-body-sm tracking-widest">
                  {room.code}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
