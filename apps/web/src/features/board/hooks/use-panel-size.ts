'use client';

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

/*
 * A panel edge people can drag, or move with the arrow keys (Shift for
 * bigger steps), as the WAI-ARIA window splitter pattern describes.
 *
 * `direction` says which way growing goes: 1 when dragging right or down
 * makes the panel bigger (a panel on the left or top), -1 when it makes it
 * smaller (a panel on the right or bottom).
 */

export interface PanelSizeOptions {
  initial: number;
  min: number;
  max: number;
  axis: 'x' | 'y';
  direction: 1 | -1;
}

export interface SeparatorProps {
  role: 'separator';
  tabIndex: 0;
  'aria-orientation': 'vertical' | 'horizontal';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

const STEP = 16;
const BIG_STEP = 48;

export function clampSize(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function usePanelSize({
  initial,
  min,
  max,
  axis,
  direction,
}: PanelSizeOptions): { size: number; separator: SeparatorProps } {
  const [size, setSize] = useState(() => clampSize(initial, min, max));
  const drag = useRef<{ from: number; start: number } | null>(null);

  const resize = useCallback(
    (next: number) => setSize(clampSize(next, min, max)),
    [min, max],
  );

  const separator: SeparatorProps = {
    role: 'separator',
    tabIndex: 0,
    // A separator between side-by-side panels is a vertical line.
    'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
    'aria-valuenow': size,
    'aria-valuemin': min,
    'aria-valuemax': max,
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      drag.current = {
        from: axis === 'x' ? event.clientX : event.clientY,
        start: size,
      };
    },
    onPointerMove: (event) => {
      if (!drag.current) return;
      const at = axis === 'x' ? event.clientX : event.clientY;
      resize(drag.current.start + direction * (at - drag.current.from));
    },
    onPointerUp: () => {
      drag.current = null;
    },
    onKeyDown: (event) => {
      const forward = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
      const back = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
      const sign = event.key === forward ? 1 : event.key === back ? -1 : 0;
      if (event.key === 'Home') resize(direction === 1 ? min : max);
      else if (event.key === 'End') resize(direction === 1 ? max : min);
      else if (sign) {
        resize(size + direction * sign * (event.shiftKey ? BIG_STEP : STEP));
      } else return;
      event.preventDefault();
    },
  };

  return { size, separator };
}
