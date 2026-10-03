'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  CopyButton,
  FormField,
  Input,
  Typography,
  buttonVariants,
  inputVariants,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { createBoard } from '../api/boards.api';
import {
  BOARD_DEFAULT_SEATS,
  BOARD_LANGUAGES,
  BOARD_NAME_MAX_LENGTH,
  BOARD_QUERY_KEYS,
  BOARD_SEAT_OPTIONS,
  boardRoomPath,
} from '../constants/board.constant';
import {
  type CreateRoomOutput,
  type CreateRoomValues,
  createRoomSchema,
} from '../schemas/board.schema';

export default function CreateRoomCard() {
  const queryClient = useQueryClient();
  const form = useForm<CreateRoomValues, unknown, CreateRoomOutput>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { name: '', language: 'cpp', seats: BOARD_DEFAULT_SEATS },
  });
  const { errors } = form.formState;

  const create = useMutation({
    mutationFn: createBoard,
    onSuccess: (board) => {
      queryClient.setQueryData(BOARD_QUERY_KEYS.detail(board.code), board);
      void queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEYS.list() });
    },
  });

  const created = create.data;

  return (
    <Card as="section" aria-labelledby="create-room-heading" padding="lg">
      <Typography as="h2" variant="h4" id="create-room-heading">
        Start a new room
      </Typography>
      <Typography variant="bodyMuted" className="mt-1">
        You become the host. Share the room ID so your squad can join.
      </Typography>

      {created ? (
        <div role="status" className="mt-6 flex flex-col gap-4">
          <Typography variant="bodyMuted">
            {created.name} is ready. Share this ID:
          </Typography>
          <p className="text-primary font-mono text-display-sm tracking-[0.2em]">
            {created.code}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={boardRoomPath(created.code)}
              className={buttonVariants()}
            >
              Open the room
            </Link>
            <CopyButton
              text={created.code}
              label="Copy room ID"
              size="default"
            />
            <Button
              variant="ghost"
              onClick={() => {
                create.reset();
                form.reset();
              }}
            >
              Start another
            </Button>
          </div>
        </div>
      ) : (
        <form
          noValidate
          className="mt-6 flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          {create.isError ? (
            <Alert tone="danger">{getErrorMessage(create.error)}</Alert>
          ) : null}
          <FormField
            id="room-name"
            label="Room name"
            required
            error={errors.name?.message}
          >
            {(control) => (
              <Input
                {...control}
                placeholder="Two-sum warmup"
                maxLength={BOARD_NAME_MAX_LENGTH}
                autoComplete="off"
                {...form.register('name')}
              />
            )}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField id="room-language" label="Starting language">
              {(control) => (
                <select
                  {...control}
                  className={inputVariants()}
                  {...form.register('language')}
                >
                  {BOARD_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField
              id="room-seats"
              label="Seats"
              error={errors.seats?.message}
            >
              {(control) => (
                <select
                  {...control}
                  className={inputVariants()}
                  {...form.register('seats')}
                >
                  {BOARD_SEAT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create room'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
