'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Users } from 'lucide-react';
import {
  Alert,
  Button,
  EmptyState,
  Spinner,
  Typography,
  buttonVariants,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { listBoards } from '../api/boards.api';
import {
  BOARD_PATH,
  BOARD_QUERY_KEYS,
  BOARD_RETENTION_DAYS,
} from '../constants/board.constant';
import RoomList from './RoomList';

/** How many rooms the dashboard shows before "All rooms". */
export const RECENT_ROOMS_LIMIT = 5;

/*
 * The dashboard's way back into your coding board rooms: the most recent
 * few, each opening with its code, whiteboard and chat as they were left.
 * It shares the lobby's query, so both stay in step.
 */
export default function RecentRooms() {
  const rooms = useQuery({
    queryKey: BOARD_QUERY_KEYS.list(),
    queryFn: ({ signal }) => listBoards(signal),
  });
  const total = rooms.data?.totalItems ?? 0;

  return (
    <section
      aria-labelledby="recent-rooms-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-4">
        <Typography as="h2" variant="h5" id="recent-rooms-heading">
          Your rooms
        </Typography>
        {total > 0 ? (
          <Link
            href={BOARD_PATH}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            {total > RECENT_ROOMS_LIMIT ? `All ${total} rooms` : 'All rooms'}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

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
          description={`Start a coding board room to code, sketch and chat with your squad. Rooms are kept for ${BOARD_RETENTION_DAYS} days.`}
          className="py-10 md:py-12"
          action={
            <Link href={BOARD_PATH} className={buttonVariants({ size: 'sm' })}>
              Start a room
            </Link>
          }
        />
      ) : (
        <RoomList rooms={rooms.data.data.slice(0, RECENT_ROOMS_LIMIT)} />
      )}
    </section>
  );
}
