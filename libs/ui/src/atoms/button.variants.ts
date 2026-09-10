import { tv } from '../utils';

/*
 * Deliberately its own module, with no 'use client'.
 *
 * Button itself is a client component so consumers can hand it event
 * handlers. If these variants lived in that file they would be a client
 * export, and calling one from a server component — which is exactly what
 * `<Link className={buttonVariants(...)}>` does on a static page — fails at
 * prerender with "attempted to call a client function from the server".
 *
 * Keeping them here lets both sides import the same styling.
 */
export const buttonVariants = tv({
  base: 'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline:
        'border border-input bg-card hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      /** Inverted — reads as near-black on light, near-white on dark. */
      dark: 'bg-foreground text-background hover:bg-foreground/90',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-9 px-3 text-sm',
      default: 'h-10 px-4 py-2 text-sm',
      lg: 'h-11 px-8 text-base',
      /** Marketing calls to action; taller than anything in the product UI. */
      xl: 'h-13 px-8 text-base',
      icon: 'h-10 w-10',
    },
    shape: {
      rounded: '',
      pill: 'rounded-full',
      square: 'rounded-none',
    },
    fullWidth: {
      true: 'w-full',
      false: 'w-auto',
    },
  },
  /* Radius tracks size, but only while the shape is the default `rounded`. */
  compoundVariants: [
    { shape: 'rounded', size: 'sm', class: 'rounded-sm' },
    { shape: 'rounded', size: 'default', class: 'rounded-md' },
    { shape: 'rounded', size: 'lg', class: 'rounded-lg' },
    { shape: 'rounded', size: 'xl', class: 'rounded-xl' },
    { shape: 'rounded', size: 'icon', class: 'rounded-md' },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'default',
    shape: 'rounded',
  },
});
