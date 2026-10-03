'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, RotateCw } from 'lucide-react';
import {
  Alert,
  Button,
  EmptyState,
  Spinner,
  buttonVariants,
} from '@squadup.in/ui';
import { useCurrentUser } from '@/features/auth';
import { getErrorMessage, isApiError } from '@/lib/api';
import { getBoard, joinBoard } from '../api/boards.api';
import { BOARD_PATH, BOARD_QUERY_KEYS } from '../constants/board.constant';
import RoomWorkspace from './RoomWorkspace';

export interface BoardRoomProps {
  code: string;
}

/* /board/[code]: load the room, then open it live; or offer to join it. */
export default function BoardRoom({ code }: BoardRoomProps) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const room = useQuery({
    queryKey: BOARD_QUERY_KEYS.detail(code),
    queryFn: ({ signal }) => getBoard(code, signal),
  });
  const join = useMutation({
    mutationFn: () => joinBoard(code),
    onSuccess: (board) => {
      queryClient.setQueryData(BOARD_QUERY_KEYS.detail(code), board);
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.list() });
    },
  });

  if (room.isPending || !currentUser.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Opening the room" />
      </div>
    );
  }

  if (room.isError) {
    const notMember = isApiError(room.error) && room.error.status === 403;
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-16">
        <div className="flex w-full max-w-md flex-col gap-4">
          {notMember ? (
            <EmptyState
              icon={DoorOpen}
              title="You're not in this room yet"
              description={`Join room ${code} to code with this squad. If the room is full or the ID is wrong, we'll say so.`}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={() => join.mutate()}
                    disabled={join.isPending}
                  >
                    {join.isPending ? 'Joining…' : 'Join this room'}
                  </Button>
                  <Link
                    href={BOARD_PATH}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Back to rooms
                  </Link>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={RotateCw}
              title="We couldn't open this room"
              description={getErrorMessage(room.error)}
              action={
                <Button variant="outline" onClick={() => void room.refetch()}>
                  Try again
                </Button>
              }
            />
          )}
          {join.isError ? (
            <Alert tone="danger">{getErrorMessage(join.error)}</Alert>
          ) : null}
        </div>
      </div>
    );
  }

  const you = currentUser.data;
  return (
    <RoomWorkspace
      board={room.data}
      you={{
        id: you.id,
        name:
          you.fullName?.trim() ||
          (you.username ? `@${you.username}` : 'SquadUp member'),
      }}
    />
  );
}
