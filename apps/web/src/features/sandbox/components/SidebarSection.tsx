'use client';

import { type ReactNode, useId } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@squadup.in/ui';

export interface SidebarSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Buttons on the right of the heading, e.g. New file. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/* A sidebar section whose heading collapses it, as VS Code's are. */
export default function SidebarSection({
  title,
  open,
  onToggle,
  actions,
  children,
  className,
}: SidebarSectionProps) {
  const contentId = useId();
  return (
    <section
      aria-label={title}
      className={cn('flex min-h-0 flex-col', className)}
    >
      <div className="group/section flex h-9 shrink-0 items-center pr-1">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-caption flex h-9 w-full cursor-pointer items-center gap-1 pl-2 font-semibold focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0 motion-safe:transition-transform',
                open && 'rotate-90',
              )}
            />
            {title}
          </button>
        </h2>
        {open && actions ? (
          <div className="flex items-center gap-0.5">{actions}</div>
        ) : null}
      </div>
      {open ? (
        <div id={contentId} className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      ) : null}
    </section>
  );
}
