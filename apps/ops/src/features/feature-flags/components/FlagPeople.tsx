'use client';

import { useId } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Badge, Button, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { removeUserAccess, setUserAccess } from '../api/feature-flags.api';
import type { FeatureFlag, FeatureFlagUser } from '../types/feature-flag.types';
import { personLabel } from '../utils/audience';
import AddPersonForm from './AddPersonForm';

export interface FlagPeopleProps {
  flag: FeatureFlag;
  onSaved: (flag: FeatureFlag) => void;
}

type Change =
  | { kind: 'set'; userId: string; enabled: boolean }
  | { kind: 'remove'; userId: string };

/*
 * People with their own decision on the flag. A grant lets someone in while
 * the flag is open to selected people; a deny keeps someone out even when
 * it's open to everyone. Neither applies while the flag is off.
 */
export default function FlagPeople({ flag, onSaved }: FlagPeopleProps) {
  const headingId = useId();
  const change = useMutation({
    mutationFn: (next: Change) =>
      next.kind === 'set'
        ? setUserAccess(flag.key, next.userId, next.enabled)
        : removeUserAccess(flag.key, next.userId),
    onSuccess: onSaved,
  });
  const decided = new Set(flag.users.map((u) => u.userId));

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Typography as="h2" variant="h5" id={headingId}>
          People
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          {flag.audience === 'off'
            ? 'The flag is off, so nobody below can use it until you open it again.'
            : 'A grant lets someone in; a deny keeps someone out, even when it is open to everyone.'}
        </Typography>
      </div>

      <AddPersonForm
        decided={decided}
        busy={change.isPending}
        onDecide={(userId, enabled) =>
          change.mutate({ kind: 'set', userId, enabled })
        }
      />

      {change.isError ? (
        <Alert tone="danger">{getErrorMessage(change.error)}</Alert>
      ) : null}

      {flag.users.length === 0 ? (
        <p className="border-border text-muted-foreground text-body-sm rounded-xl border border-dashed px-4 py-6 text-center">
          Nobody has their own access yet.
        </p>
      ) : (
        <ul
          aria-label="People with their own access"
          className="border-border divide-border divide-y rounded-xl border"
        >
          {flag.users.map((user) => (
            <PersonRow
              key={user.userId}
              user={user}
              busy={change.isPending}
              onToggle={() =>
                change.mutate({
                  kind: 'set',
                  userId: user.userId,
                  enabled: !user.enabled,
                })
              }
              onRemove={() =>
                change.mutate({ kind: 'remove', userId: user.userId })
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PersonRow({
  user,
  busy,
  onToggle,
  onRemove,
}: {
  user: FeatureFlagUser;
  busy: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { primary, secondary } = personLabel(user);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-sm truncate font-medium">{primary}</span>
        {secondary ? (
          <span className="text-caption text-muted-foreground truncate">
            {secondary}
          </span>
        ) : null}
      </span>
      <Badge variant={user.enabled ? 'success' : 'danger'} dot>
        {user.enabled ? 'Granted' : 'Denied'}
      </Badge>
      <span className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onToggle}
          aria-label={`${user.enabled ? 'Deny' : 'Grant'} ${primary}`}
        >
          {user.enabled ? 'Deny' : 'Grant'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onRemove}
          aria-label={`Remove ${primary}`}
        >
          Remove
        </Button>
      </span>
    </li>
  );
}
