import type { ReactNode } from 'react';
import { Typography } from '@squadup.in/ui';

/*
 * The page's one h1, and a line under it. Every /auth screen opens with this
 * so the forms line up when moving between them.
 */

export interface AuthFormHeaderProps {
  title: ReactNode;
  description?: ReactNode;
}

export default function AuthFormHeader({
  title,
  description,
}: AuthFormHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-2">
      <Typography as="h1" variant="h3">
        {title}
      </Typography>
      {description ? (
        <Typography variant="bodySmall" className="text-muted-foreground">
          {description}
        </Typography>
      ) : null}
    </header>
  );
}
