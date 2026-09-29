import type { ReactNode } from 'react';
import { Card, Typography } from '@squadup.in/ui';

/* One section of a settings page: a heading, what it does, and its controls. */

export interface SettingsCardProps {
  title: string;
  description?: ReactNode;
  headingId: string;
  children: ReactNode;
}

export default function SettingsCard({
  title,
  description,
  headingId,
  children,
}: SettingsCardProps) {
  return (
    <Card as="section" aria-labelledby={headingId} padding="md">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Typography as="h2" variant="h6" id={headingId}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="bodySmall" className="text-muted-foreground">
              {description}
            </Typography>
          ) : null}
        </div>
        {children}
      </div>
    </Card>
  );
}
