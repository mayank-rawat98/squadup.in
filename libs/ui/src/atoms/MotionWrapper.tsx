'use client';

import type { ReactNode } from 'react';
import { type HTMLMotionProps, motion, useReducedMotion } from 'motion/react';

/*
 * The scroll-reveal primitive. Sections fade their children in once, in
 * sequence, by handing each child an increasing `delay`.
 *
 * The landing doc repeats "no heavy motion" for every section, so the distance
 * is deliberately short and the reveal never replays on scroll-back.
 */

export interface MotionWrapperProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  /** Seconds to wait before this element reveals. Stagger siblings with it. */
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  fullWidth?: boolean;
}

const DISTANCE = 20;

const VARIANTS = {
  up: { hidden: { opacity: 0, y: DISTANCE }, visible: { opacity: 1, y: 0 } },
  down: { hidden: { opacity: 0, y: -DISTANCE }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: DISTANCE }, visible: { opacity: 1, x: 0 } },
  right: {
    hidden: { opacity: 0, x: -DISTANCE },
    visible: { opacity: 1, x: 0 },
  },
  none: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
} as const;

function MotionWrapper({
  children,
  delay = 0,
  direction = 'up',
  className,
  fullWidth = false,
  ...props
}: MotionWrapperProps) {
  /*
   * With reduced motion the element still fades, but nothing travels — the
   * fade carries no vestibular risk and keeps the sequencing readable.
   */
  const reduced = useReducedMotion();
  const variants = VARIANTS[reduced ? 'none' : direction];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      variants={variants}
      className={className}
      style={{ width: fullWidth ? '100%' : undefined }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

MotionWrapper.displayName = 'MotionWrapper';

export default MotionWrapper;
