'use client';

import { useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar, Button, FieldError, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import type { CurrentUser } from '@/features/auth';
import { removeAvatar, uploadAvatar } from '../api/account.api';
import { AVATAR_TYPES } from '../constants/account.constant';
import { useRefreshCurrentUser } from '../hooks/use-refresh-current-user';
import { avatarFileError } from '../utils/avatar-file';
import SettingsCard from './SettingsCard';

/*
 * Uploads as soon as a file is picked: there is nothing else to fill in, so
 * a separate "Save" step would only be one more click. The file is checked
 * against the API's rules first, so a wrong type fails here, not after an
 * upload.
 */
export default function AvatarCard({ user }: { user: CurrentUser }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const refresh = useRefreshCurrentUser();
  const name = user.fullName?.trim() || user.email;

  const upload = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: async () => {
      await refresh();
      toast.success('Your photo is updated.');
    },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  const remove = useMutation({
    mutationFn: removeAvatar,
    onSuccess: async () => {
      await refresh();
      toast.success('Your photo is removed.');
    },
    onError: (failure) => setError(getErrorMessage(failure)),
  });

  const busy = upload.isPending || remove.isPending;

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const problem = avatarFileError(file);
    setError(problem);
    if (!problem) upload.mutate(file);
  };

  return (
    <SettingsCard
      title="Photo"
      description="Shown on your profile and next to your work. JPG, PNG or WebP, up to 5 MB."
      headingId="avatar-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={name} src={user.avatarUrl ?? undefined} size="xl" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              onPick(event.target.files?.[0]);
              // Picking the same file again should upload again.
              event.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            aria-describedby={error ? errorId : undefined}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending
              ? 'Uploading…'
              : user.avatarUrl
                ? 'Change photo'
                : 'Upload photo'}
          </Button>
          {user.avatarUrl ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setError(null);
                remove.mutate();
              }}
            >
              {remove.isPending ? 'Removing…' : 'Remove photo'}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </SettingsCard>
  );
}
