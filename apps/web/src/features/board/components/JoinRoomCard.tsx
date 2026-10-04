'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, FormField, OtpInput, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { joinBoard } from '../api/boards.api';
import {
  BOARD_CODE_LENGTH,
  BOARD_QUERY_KEYS,
  boardRoomPath,
} from '../constants/board.constant';
import { type JoinRoomValues, joinRoomSchema } from '../schemas/board.schema';

export default function JoinRoomCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<JoinRoomValues, unknown, { code: string }>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: { code: '' },
  });

  const join = useMutation({
    mutationFn: (code: string) => joinBoard(code),
    onSuccess: (board) => {
      queryClient.setQueryData(BOARD_QUERY_KEYS.detail(board.code), board);
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.list() });
      router.push(boardRoomPath(board.code));
    },
  });

  const error =
    form.formState.errors.code?.message ??
    (join.isError ? getErrorMessage(join.error) : undefined);

  return (
    <Card as="section" aria-labelledby="join-room-heading" padding="lg">
      <Typography as="h2" variant="h4" id="join-room-heading">
        Join a room
      </Typography>
      <Typography variant="bodyMuted" className="mt-1">
        Enter the ID your squad shared. Letters and numbers, any case.
      </Typography>
      <form
        noValidate
        className="mt-6 flex flex-col gap-4"
        onSubmit={form.handleSubmit(({ code }) => join.mutate(code))}
      >
        <FormField id="room-id" label="Room ID" error={error}>
          {(control) => (
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => (
                <OtpInput
                  {...control}
                  charset="alphanumeric"
                  length={BOARD_CODE_LENGTH}
                  name={field.name}
                  value={field.value}
                  onChange={(value) => {
                    join.reset();
                    field.onChange(value);
                  }}
                />
              )}
            />
          )}
        </FormField>
        <div>
          <Button type="submit" disabled={join.isPending}>
            {join.isPending ? 'Joining…' : 'Join room'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
