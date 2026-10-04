'use client';

import { useId, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Input, Spinner, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import {
  approveRequest,
  listPendingRequests,
  rejectRequest,
} from '../api/feature-flags.api';
import { FEATURE_FLAG_QUERY_KEYS } from '../constants/feature-flags.constant';
import type { FeatureRequest } from '../types/feature-flag.types';
import { personLabel } from '../utils/audience';

export interface FlagRequestsProps {
  featureKey: string;
  /** Called after a decision, so the flag's people list refreshes. */
  onDecided: () => void;
}

type Decision =
  | { id: string; approve: true }
  | { id: string; approve: false; reason: string };

/* People asking for access. Approving grants them; rejecting can say why, which they see. */
export default function FlagRequests({
  featureKey,
  onDecided,
}: FlagRequestsProps) {
  const headingId = useId();
  const requests = useQuery({
    queryKey: FEATURE_FLAG_QUERY_KEYS.requests(featureKey),
    queryFn: ({ signal }) => listPendingRequests(featureKey, signal),
  });
  const decide = useMutation({
    mutationFn: (decision: Decision) =>
      decision.approve
        ? approveRequest(decision.id)
        : rejectRequest(decision.id, decision.reason.trim() || undefined),
    onSuccess: () => {
      void requests.refetch();
      onDecided();
    },
  });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <Typography as="h2" variant="h5" id={headingId}>
        Access requests
      </Typography>
      {requests.isPending ? (
        <Spinner label="Loading access requests" />
      ) : requests.isError ? (
        <Alert tone="danger">{getErrorMessage(requests.error)}</Alert>
      ) : requests.data.length === 0 ? (
        <p className="border-border text-muted-foreground text-body-sm rounded-xl border border-dashed px-4 py-6 text-center">
          No requests are waiting.
        </p>
      ) : (
        <ul
          aria-label="Waiting requests"
          className="border-border divide-border divide-y rounded-xl border"
        >
          {requests.data.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              busy={decide.isPending}
              onDecide={(decision) => decide.mutate(decision)}
            />
          ))}
        </ul>
      )}
      {decide.isError ? (
        <Alert tone="danger">{getErrorMessage(decide.error)}</Alert>
      ) : null}
    </section>
  );
}

function RequestRow({
  request,
  busy,
  onDecide,
}: {
  request: FeatureRequest;
  busy: boolean;
  onDecide: (decision: Decision) => void;
}) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const { primary, secondary } = personLabel({
    name: request.userName,
    email: request.userEmail,
    userId: request.userId,
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-body-sm font-medium">{primary}</span>
        {secondary ? (
          <span className="text-caption text-muted-foreground">
            {secondary}
          </span>
        ) : null}
        {request.requestMessage ? (
          <p className="text-body-sm mt-1">“{request.requestMessage}”</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => onDecide({ id: request.id, approve: true })}
          aria-label={`Approve ${primary}`}
        >
          Approve
        </Button>
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor={reasonId} className="sr-only">
            Reason for rejecting {primary}, shown to them
          </label>
          <Input
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason, shown to them (optional)"
            maxLength={1000}
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onDecide({ id: request.id, approve: false, reason })}
          aria-label={`Reject ${primary}`}
        >
          Reject
        </Button>
      </div>
    </li>
  );
}
