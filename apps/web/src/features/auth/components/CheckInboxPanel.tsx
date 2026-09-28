import type { ReactNode } from 'react';
import { MailCheck } from 'lucide-react';
import { Typography } from '@squadup.in/ui';
import ResendVerificationButton from './ResendVerificationButton';

/*
 * Shown after registering (and reused wherever a verify link has just been
 * sent). It names the address, so a typo is obvious, and offers the resend.
 */

export interface CheckInboxPanelProps {
  email: string;
  /** A link back, e.g. to sign in or to register with another address. */
  footer?: ReactNode;
}

export default function CheckInboxPanel({
  email,
  footer,
}: CheckInboxPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <span className="bg-accent text-accent-foreground flex h-12 w-12 items-center justify-center rounded-xl">
        <MailCheck aria-hidden="true" className="h-6 w-6" />
      </span>
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h3">
          Check your inbox
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          We sent a verification link to{' '}
          <span className="text-foreground font-medium break-words">
            {email}
          </span>
          . Open it to verify your email. The link is valid for 15 minutes.
        </Typography>
      </header>
      <div className="flex flex-col gap-3">
        <Typography variant="bodySmall" className="text-muted-foreground">
          Nothing there? Check your spam folder, or send it again.
        </Typography>
        <ResendVerificationButton email={email} fullWidth startCoolingDown />
      </div>
      {footer}
    </div>
  );
}
