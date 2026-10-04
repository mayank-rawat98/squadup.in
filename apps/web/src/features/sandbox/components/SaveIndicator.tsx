import { AlertTriangle, Check, CloudUpload, Loader2 } from 'lucide-react';
import { cn } from '@squadup.in/ui';
import { SANDBOX_MAX_TOTAL_BYTES } from '../constants/sandbox.constant';
import type { SaveStatus } from '../types/sandbox.types';

export interface SaveIndicatorProps {
  status: SaveStatus;
  onRetry: () => void;
}

const LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Couldn’t save',
  'too-large': `Over ${SANDBOX_MAX_TOTAL_BYTES / 1000} KB, not saved`,
};

/* Where the latest edits are, in words and an icon; read out as it changes. */
export default function SaveIndicator({ status, onRetry }: SaveIndicatorProps) {
  const problem = status === 'error' || status === 'too-large';
  const Icon =
    status === 'saved'
      ? Check
      : status === 'saving'
        ? Loader2
        : problem
          ? AlertTriangle
          : CloudUpload;

  return (
    <div
      role="status"
      className={cn(
        'text-caption flex shrink-0 items-center gap-1.5',
        problem ? 'text-danger' : 'text-muted-foreground',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'h-3.5 w-3.5',
          status === 'saving' && 'motion-safe:animate-spin',
        )}
      />
      <span>{LABEL[status]}</span>
      {status === 'error' ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-primary focus-visible:ring-ring cursor-pointer rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
