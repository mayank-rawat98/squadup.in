'use client';

import { useMutation } from '@tanstack/react-query';
import { Button, type ButtonProps, toast } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { resendVerificationEmail } from '../api/auth.api';
import { RESEND_COOLDOWN_SECONDS } from '../constants/auth.constant';
import { useCooldown } from '../hooks/use-cooldown';

/*
 * Sends a fresh verify link, then waits a minute before it can be pressed
 * again. Used after registering, on an expired link, and in the unverified
 * banner. The countdown is in the label, so it's read out with the button.
 */

export interface ResendVerificationButtonProps
  extends Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'className'> {
  email: string;
  /** Start in the cooldown, e.g. right after registering sent the first link. */
  startCoolingDown?: boolean;
}

export default function ResendVerificationButton({
  email,
  variant = 'outline',
  startCoolingDown = false,
  ...buttonProps
}: ResendVerificationButtonProps) {
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS, {
    startActive: startCoolingDown,
  });

  const mutation = useMutation({
    mutationFn: () => resendVerificationEmail(email),
    onSuccess: (message) => {
      toast.success(message || `We sent a new link to ${email}.`);
      cooldown.start();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <Button
      variant={variant}
      disabled={mutation.isPending || cooldown.active}
      onClick={() => mutation.mutate()}
      {...buttonProps}
    >
      {mutation.isPending
        ? 'Sending…'
        : cooldown.active
          ? `Resend in ${cooldown.remaining}s`
          : 'Resend the email'}
    </Button>
  );
}
