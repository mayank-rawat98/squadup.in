import { tv } from '../utils';

/*
 * Its own module, like button.variants, so PasswordInput and OtpInput can
 * share the same field chrome without importing a component.
 *
 * The invalid state keys off `aria-invalid` rather than a prop, so a field is
 * only ever red when a screen reader is also told it's wrong.
 */
export const inputVariants = tv({
  base: 'border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive flex w-full min-w-0 rounded-md border px-3 text-body-sm shadow-1 transition-colors file:border-0 file:bg-transparent file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  variants: {
    size: {
      sm: 'h-9',
      default: 'h-10',
      lg: 'h-11 text-body',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});
