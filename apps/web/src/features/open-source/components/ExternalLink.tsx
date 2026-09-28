import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@squadup.in/ui';

/*
 * A link that leaves squadup.in for GitHub. It opens in a new tab, so it says
 * so to screen readers, and the arrow shows it to everyone else.
 */
export default function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
