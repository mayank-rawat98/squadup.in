import { cn } from '@squadup.in/ui';
import type { SeparatorProps } from '../hooks/use-panel-size';

export interface ResizeHandleProps extends SeparatorProps {
  /** What is being resized, e.g. "Resize the chat". */
  'aria-label': string;
  className?: string;
}

/*
 * A thin line between two panels with a wider invisible grab area. It sits
 * on the panel border (negative margin), so it costs no layout space.
 */
export default function ResizeHandle({
  className,
  ...props
}: ResizeHandleProps) {
  const vertical = props['aria-orientation'] === 'vertical';
  return (
    <div
      {...props}
      className={cn(
        'group focus-visible:outline-none relative z-10 shrink-0 touch-none',
        vertical
          ? '-mx-1 w-2 cursor-col-resize self-stretch'
          : '-my-1 h-2 cursor-row-resize',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'group-hover:bg-primary group-focus-visible:bg-primary absolute bg-transparent transition-colors',
          vertical
            ? 'inset-y-0 left-1/2 w-0.5 -translate-x-1/2'
            : 'inset-x-0 top-1/2 h-0.5 -translate-y-1/2',
        )}
      />
    </div>
  );
}
