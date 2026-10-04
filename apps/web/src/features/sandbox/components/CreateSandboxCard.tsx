'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  Typography,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { createSandbox } from '../api/sandboxes.api';
import {
  SANDBOX_NAME_MAX_LENGTH,
  SANDBOX_QUERY_KEYS,
  sandboxWorkspacePath,
} from '../constants/sandbox.constant';
import { createReactTsScaffold } from '../scaffold/react-ts-scaffold';
import {
  type CreateSandboxValues,
  createSandboxSchema,
} from '../schemas/sandbox.schema';

/* Names a new sandbox, saves it from the scaffold and opens it. */
export default function CreateSandboxCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<CreateSandboxValues>({
    resolver: zodResolver(createSandboxSchema),
    defaultValues: { name: '' },
  });

  const create = useMutation({
    mutationFn: ({ name }: CreateSandboxValues) =>
      createSandbox({ name, files: createReactTsScaffold(name) }),
    onSuccess: (sandbox) => {
      queryClient.setQueryData(SANDBOX_QUERY_KEYS.detail(sandbox.id), sandbox);
      void queryClient.invalidateQueries({
        queryKey: SANDBOX_QUERY_KEYS.list(),
      });
      router.push(sandboxWorkspacePath(sandbox.id));
    },
  });

  return (
    <Card as="section" aria-labelledby="new-sandbox-heading" padding="lg">
      <Typography as="h2" variant="h4" id="new-sandbox-heading">
        Start a React sandbox
      </Typography>
      <Typography variant="bodyMuted" className="mt-1">
        You get a React + TypeScript project with Vite&apos;s layout. Edit
        src/App.tsx and the preview updates as you type.
      </Typography>
      <form
        noValidate
        className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
      >
        <FormField
          id="sandbox-name"
          label="Sandbox name"
          required
          error={form.formState.errors.name?.message}
          className="flex-1"
        >
          {(control) => (
            <Input
              {...control}
              placeholder="Todo app"
              maxLength={SANDBOX_NAME_MAX_LENGTH}
              autoComplete="off"
              {...form.register('name')}
            />
          )}
        </FormField>
        <Button type="submit" disabled={create.isPending} className="sm:mt-7">
          {create.isPending ? 'Creating…' : 'Create sandbox'}
        </Button>
      </form>
      {create.isError ? (
        <Alert tone="danger" className="mt-4">
          {getErrorMessage(create.error)}
        </Alert>
      ) : null}
    </Card>
  );
}
