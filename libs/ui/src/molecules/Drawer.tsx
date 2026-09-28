'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../utils';

/*
 * A panel that slides over the page from one edge: the mobile navigation.
 *
 * Built on the native modal <dialog>, which gives focus trapping, Escape to
 * close, an inert page behind it and a ::backdrop for free, without a
 * dependency. The parent owns `open`; every way of closing (Escape, a click
 * on the backdrop, a link inside) reports through `onClose`.
 */

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Names the drawer for assistive technology, e.g. "Navigation". */
  label: string;
  side?: 'left' | 'right';
  children: ReactNode;
  className?: string;
}

function Drawer({
  open,
  onClose,
  label,
  side = 'left',
  children,
  className,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /* A modal dialog doesn't stop the page behind it from scrolling. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClose={onClose}
      onCancel={(event) => {
        // Let the parent close it, so `open` stays the single source of truth.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // The dialog element itself is only hit through its ::backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'bg-background text-foreground border-border fixed inset-y-0 m-0 h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none overflow-y-auto p-0 shadow-5 backdrop:bg-foreground/40',
        side === 'left' ? 'left-0 border-r' : 'right-0 left-auto border-l',
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}

Drawer.displayName = 'Drawer';

export default Drawer;
