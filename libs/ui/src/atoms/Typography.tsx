import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
  type Ref,
  forwardRef,
} from 'react';
import { cn, tv } from '../utils';

/*
 * Every piece of text on a squadup surface renders through this atom, so the
 * type scale stays in one place. Reach for a raw `text-*` class only when a
 * one-off overrides a variant, never to reinvent one.
 *
 * `variant` picks the size, and `as` picks the tag. They are independent on
 * purpose: a section heading that must be an <h2> for document outline can
 * still be sized with `displayMd`.
 */

export type TypographyVariant =
  | 'displayXl'
  | 'displayLg'
  | 'displayMd'
  | 'displaySm'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'subtitle'
  | 'subtitle2'
  | 'body'
  | 'bodySmall'
  | 'bodyMuted'
  | 'overline'
  | 'caption'
  | 'micro';

type Align = 'left' | 'center' | 'right' | 'justify';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
type Spacing = 'tight' | 'normal' | 'wide';

const typography = tv({
  base: 'text-foreground',
  variants: {
    /*
     * Each variant bakes in its styleguide font-weight. Passing `weight`
     * overrides it — tailwind-merge keeps the last of two font-weight classes.
     */
    variant: {
      displayXl: 'text-display-xl font-bold',
      displayLg: 'text-display-lg font-bold',
      displayMd: 'text-display-md font-bold',
      displaySm: 'text-display-sm font-semibold',
      h1: 'text-h1 font-bold',
      h2: 'text-h2 font-semibold',
      h3: 'text-h3 font-semibold',
      h4: 'text-h4 font-semibold',
      h5: 'text-h5 font-medium',
      h6: 'text-h6 font-medium',
      subtitle: 'text-subtitle font-normal',
      subtitle2: 'text-subtitle2 font-normal',
      body: 'text-body font-normal',
      bodySmall: 'text-body-sm font-normal',
      bodyMuted: 'text-body text-muted-foreground font-normal',
      overline: 'text-overline font-semibold',
      caption: 'text-caption font-normal',
      micro: 'text-micro font-normal',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    spacing: {
      tight: 'tracking-(--tracking-tight)',
      normal: 'tracking-(--tracking-normal)',
      wide: 'tracking-(--tracking-wide)',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

type PolymorphicProps<T extends ElementType> = {
  as?: T;
  variant?: TypographyVariant;
  align?: Align;
  weight?: Weight;
  spacing?: Spacing;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const TypographyInner = <T extends ElementType = 'p'>(
  {
    as,
    variant,
    align,
    weight,
    spacing,
    className,
    ...rest
  }: PolymorphicProps<T>,
  ref: Ref<Element>,
) => {
  const Component = (as || 'p') as ElementType;
  return (
    <Component
      ref={ref}
      className={cn(typography({ variant, align, weight, spacing }), className)}
      {...rest}
    />
  );
};

export const Typography = forwardRef(TypographyInner) as <
  T extends ElementType = 'p',
>(
  props: PolymorphicProps<T> & { ref?: Ref<Element> },
) => ReactNode;

export default Typography;
