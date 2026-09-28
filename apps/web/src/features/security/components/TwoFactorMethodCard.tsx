import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Card, Typography } from '@squadup.in/ui';

/*
 * One 2FA method on the security page: what it is, whether it's on (as a
 * word, not just a colour), and whatever controls fit its current state.
 */

export interface TwoFactorMethodCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  enabled: boolean;
  headingId: string;
  children: ReactNode;
}

export default function TwoFactorMethodCard({
  icon: Icon,
  title,
  description,
  enabled,
  headingId,
  children,
}: TwoFactorMethodCardProps) {
  return (
    <Card as="section" aria-labelledby={headingId} padding="md">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Typography as="h3" variant="h6" id={headingId}>
                {title}
              </Typography>
              <Badge variant={enabled ? 'success' : 'outline'}>
                {enabled ? 'On' : 'Off'}
              </Badge>
            </div>
            <Typography variant="bodySmall" className="text-muted-foreground">
              {description}
            </Typography>
          </div>
        </div>
        {children}
      </div>
    </Card>
  );
}
