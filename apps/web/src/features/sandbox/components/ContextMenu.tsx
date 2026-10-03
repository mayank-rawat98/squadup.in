'use client';

import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@squadup.in/ui';

export interface ContextMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Says why the item is disabled, read with it. */
  hint?: string;
  danger?: boolean;
}

export interface ContextMenuProps {
  /** Where to open it, in viewport pixels (the pointer, or the row). */
  x: number;
  y: number;
  label: string;
  items: readonly ContextMenuItem[];
  /**
   * `select` when an item was picked (its action decides where focus goes),
   * `dismiss` otherwise (the caller puts focus back).
   */
  onClose: (reason: 'select' | 'dismiss') => void;
}

const EDGE_GAP = 8;

/*
 * A right-click menu at the pointer, as VS Code's explorer has. It is an
 * ARIA menu: focus moves into it, the arrow keys, Home and End move between
 * items, Enter or Space picks one, and Escape, Tab or a click outside closes
 * it.
 */
export default function ContextMenu({
  x,
  y,
  label,
  items,
  onClose,
}: ContextMenuProps) {
  const menu = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const enabled = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const [active, setActive] = useState(enabled[0] ?? -1);

  // Keep the whole menu on screen, flipping it up or left near an edge.
  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect();
    if (!box) return;
    setPosition({
      left: Math.max(
        EDGE_GAP,
        Math.min(x, window.innerWidth - box.width - EDGE_GAP),
      ),
      top:
        y + box.height + EDGE_GAP > window.innerHeight
          ? Math.max(EDGE_GAP, y - box.height)
          : y,
    });
  }, [x, y]);

  useEffect(() => {
    const items =
      menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]');
    items?.[active]?.focus();
  }, [active]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) onClose('dismiss');
    };
    const closeOnScroll = () => onClose('dismiss');
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('resize', closeOnScroll);
    window.addEventListener('blur', closeOnScroll);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('resize', closeOnScroll);
      window.removeEventListener('blur', closeOnScroll);
    };
  }, [onClose]);

  const move = (step: number) => {
    if (enabled.length === 0) return;
    const at = enabled.indexOf(active);
    setActive(enabled[(at + step + enabled.length) % enabled.length]);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Home: () => setActive(enabled[0] ?? -1),
      End: () => setActive(enabled.at(-1) ?? -1),
      Escape: () => onClose('dismiss'),
      Tab: () => onClose('dismiss'),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <ul
      ref={menu}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      style={{ left: position.left, top: position.top }}
      className="border-border bg-popover text-popover-foreground shadow-3 fixed z-50 min-w-48 rounded-lg border p-1"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <li key={item.label} role="none">
            <button
              type="button"
              role="menuitem"
              tabIndex={index === active ? 0 : -1}
              aria-disabled={item.disabled || undefined}
              title={item.disabled ? item.hint : undefined}
              onClick={() => {
                if (item.disabled) return;
                onClose('select');
                item.onSelect();
              }}
              onPointerMove={() => {
                if (!item.disabled) setActive(index);
              }}
              className={cn(
                'text-body-sm flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left outline-none',
                'focus-visible:bg-accent hover:bg-accent',
                item.danger && 'text-danger',
                item.disabled &&
                  'text-muted-foreground cursor-not-allowed opacity-60 hover:bg-transparent',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.disabled && item.hint ? (
                <span className="sr-only">({item.hint})</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
