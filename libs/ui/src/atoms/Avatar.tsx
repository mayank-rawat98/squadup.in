import type { HTMLAttributes, ReactNode } from 'react';
import { type VariantProps } from 'tailwind-variants';
import { cn, tv } from '../utils';

/*
 * Plain <img> rather than next/image on purpose: this library is framework
 * agnostic and avatars are small enough that the optimizer earns nothing.
 *
 * AvatarGroup is the overlapping stack the landing page uses to show a squad.
 */

const avatar = tv({
  base: 'bg-secondary text-secondary-foreground ring-card inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 select-none',
  variants: {
    size: {
      xs: 'h-6 w-6 text-micro',
      sm: 'h-8 w-8 text-caption',
      md: 'h-10 w-10 text-body-sm',
      lg: 'h-12 w-12 text-body',
      xl: 'h-16 w-16 text-h6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface AvatarProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof avatar> {
  src?: string;
  /** Describes the person. Also the source of the initials fallback. */
  name: string;
}

/** First letter of each of the first two words, e.g. "Team PixelForge" -> TP. */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

function Avatar({ src, name, size, className, ...props }: AvatarProps) {
  return (
    <span className={cn(avatar({ size }), className)} {...props}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
      {!src && <span className="sr-only">{name}</span>}
    </span>
  );
}

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Rendered as a trailing "+N" chip. Count the avatars you did not render. */
  overflow?: number;
  size?: AvatarProps['size'];
}

export function AvatarGroup({
  children,
  overflow,
  size = 'md',
  className,
  ...props
}: AvatarGroupProps) {
  return (
    <div className={cn('flex items-center -space-x-2', className)} {...props}>
      {children}
      {overflow ? (
        <span
          className={cn(
            avatar({ size }),
            'bg-accent text-accent-foreground border-card border',
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;
