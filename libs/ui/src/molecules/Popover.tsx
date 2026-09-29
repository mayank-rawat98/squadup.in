'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '../utils';

/*
 * A button that shows and hides a panel under it: the user menu and the
 * notifications list. It is a disclosure rather than an ARIA menu, so the panel
 * holds ordinary links and buttons in normal tab order, which is simpler to
 * use with a screen reader than arrow-key menu semantics.
 *
 * Escape closes it and returns focus to the trigger. A click outside closes it.
 */

export interface PopoverTriggerProps {
  ref: Ref<HTMLButtonElement>;
  type: 'button';
  'aria-expanded': boolean;
  'aria-controls': string;
  onClick: () => void;
}

export interface PopoverProps {
  /** Render the trigger, spreading these props onto a `<button>`. */
  trigger: (props: PopoverTriggerProps, open: boolean) => ReactNode;
  /** The panel content. The function form receives `close`. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Names the panel for assistive technology, e.g. "Account". */
  label: string;
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end';
  className?: string;
  panelClassName?: string;
}

function Popover({
  trigger,
  children,
  label,
  align = 'end',
  className,
  panelClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {trigger(
        {
          ref: triggerRef,
          type: 'button',
          'aria-expanded': open,
          'aria-controls': panelId,
          onClick: () => setOpen((value) => !value),
        },
        open,
      )}
      <div
        id={panelId}
        role="group"
        aria-label={label}
        hidden={!open}
        className={cn(
          'border-border bg-popover text-popover-foreground absolute top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border p-1.5 shadow-4',
          align === 'end' ? 'right-0' : 'left-0',
          panelClassName,
        )}
      >
        {open && (typeof children === 'function' ? children(close) : children)}
      </div>
    </div>
  );
}

Popover.displayName = 'Popover';

export default Popover;
