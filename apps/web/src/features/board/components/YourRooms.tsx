'use client';

import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Alert, Button, EmptyState, Spinner, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { listBoards } from '../api/boards.api';
import {
  BOARD_QUERY_KEYS,
  BOARD_RETENTION_DAYS,
} from '../constants/board.constant';
import RoomList from './RoomList';

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
          description={`Rooms you start or join show up here, so you can get back to them. Each room is deleted ${BOARD_RETENTION_DAYS} days after it's made.`}
        />
      ) : (
        <RoomList rooms={rooms.data.data} />
      )}
    </section>
  );
}
