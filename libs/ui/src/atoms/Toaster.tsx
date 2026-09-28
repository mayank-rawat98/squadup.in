'use client';

import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'sonner';

/*
 * sonner draws its own toasts, so rather than restyle every part we hand it
 * our tokens through the custom properties it reads. The toasts then follow
 * the light and dark palettes like everything else.
 *
 * Mount it once, in the layout of the routes that raise toasts, and raise them
 * with the `toast` export from this package.
 */

export type ToasterProps = SonnerProps;

const TOKEN_STYLE = {
  '--normal-bg': 'hsl(var(--popover))',
  '--normal-text': 'hsl(var(--popover-foreground))',
  '--normal-border': 'hsl(var(--border))',
  '--success-bg': 'hsl(var(--popover))',
  '--success-text': 'hsl(var(--success))',
  '--success-border': 'hsl(var(--border))',
  '--error-bg': 'hsl(var(--popover))',
  '--error-text': 'hsl(var(--destructive))',
  '--error-border': 'hsl(var(--border))',
  '--border-radius': 'var(--radius)',
} as CSSProperties;

function Toaster({ style, toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      style={{ ...TOKEN_STYLE, ...style }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: 'font-sans shadow-4',
          description: 'text-muted-foreground',
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
}

Toaster.displayName = 'Toaster';

export default Toaster;
