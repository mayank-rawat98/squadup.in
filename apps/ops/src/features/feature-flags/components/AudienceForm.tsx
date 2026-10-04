'use client';

import { type FormEvent, useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Typography, cn, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { updateFeatureFlag } from '../api/feature-flags.api';
import {
  AUDIENCE_LABELS,
  AUDIENCE_OPTIONS,
} from '../constants/feature-flags.constant';
import type { FeatureAudience, FeatureFlag } from '../types/feature-flag.types';
import { audiencePatch } from '../utils/audience';

export interface AudienceFormProps {
  flag: FeatureFlag;
  onSaved: (flag: FeatureFlag) => void;
}

/* Who the flag reaches. Saved on purpose, not on click: this changes it for real people. */
export default function AudienceForm({ flag, onSaved }: AudienceFormProps) {
  const [audience, setAudience] = useState<FeatureAudience>(flag.audience);
  const headingId = useId();
  const optionId = useId();
  const save = useMutation({
    mutationFn: () =>
      updateFeatureFlag(flag.key, audiencePatch(audience, flag.rolloutToAll)),
    onSuccess: (saved) => {
      onSaved(saved);
      toast.success(
        `${saved.name} is now: ${AUDIENCE_LABELS[saved.audience]}.`,
      );
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <Typography as="h2" variant="h5" id={headingId}>
        Who can use it
      </Typography>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Who can use {flag.name}</legend>
          {AUDIENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'border-border flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                'has-focus-visible:ring-ring has-focus-visible:ring-2',
                audience === option.value
                  ? 'border-primary bg-accent/50'
                  : 'hover:bg-accent/30',
              )}
            >
              <input
                type="radio"
                name="audience"
                value={option.value}
                checked={audience === option.value}
                onChange={() => setAudience(option.value)}
                aria-labelledby={`${optionId}-${option.value}`}
                aria-describedby={`${optionId}-${option.value}-hint`}
                className="accent-primary mt-1 h-4 w-4 shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span
                  id={`${optionId}-${option.value}`}
                  className="text-body-sm font-medium"
                >
                  {option.label}
                </span>
                <span
                  id={`${optionId}-${option.value}-hint`}
                  className="text-caption text-muted-foreground"
                >
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        {save.isError ? (
          <Alert tone="danger">{getErrorMessage(save.error)}</Alert>
        ) : null}
        <Button
          type="submit"
          className="self-start"
          disabled={audience === flag.audience || save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </section>
  );
}
