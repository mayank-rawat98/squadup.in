'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { buttonVariants } from './button.variants';
import { cn } from '../utils';

/*
 * Styling lives in ./button.variants so a server component can borrow it for
 * a link. See the note in that file.
 */

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, shape, fullWidth, type = 'button', ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonVariants({ variant, size, shape, fullWidth, className }),
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export default Button;
