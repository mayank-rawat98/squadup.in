import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@squadup.in/ui';

export interface PanelToggleProps {
  expanded: boolean;
  onToggle: () => void;
  /** The id of the region this button shows and hides. */
  controls: string;
  children: ReactNode;
  className?: string;
}

/* The header button of a collapsible panel: a chevron and the panel's name. */
export default function PanelToggle({
  expanded,
  onToggle,
  controls,
  children,
  className,
}: PanelToggleProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        'text-foreground hover:bg-accent focus-visible:ring-ring flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-body-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <ChevronDown
        aria-hidden="true"
        className={cn(
          'h-4 w-4 transition-transform motion-reduce:transition-none',
          !expanded && '-rotate-90',
        )}
      />
      {children}
    </button>
  );
}
