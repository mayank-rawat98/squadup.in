'use client';

import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import Typography from '../atoms/Typography';
import { cn } from '../utils';

/*
 * Hand-built rather than pulled from a headless kit — the frontend rules ban
 * radix and shadcn, and the behaviour here is small enough to own.
 *
 * The landing doc is specific: only one item open at a time, subtle and fast
 * animation, purple accent on the active item.
 *
 * Accessibility follows the disclosure pattern: each header is a real button
 * carrying aria-expanded and aria-controls, and the panel is labelled by it.
 */

export interface AccordionItem {
  id: string;
  question: ReactNode;
  answer: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** id of the item open on first paint. Omit to start fully collapsed. */
  defaultOpenId?: string;
  className?: string;
}

function Accordion({ items, defaultOpenId, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const reduced = useReducedMotion();
  const baseId = useId();

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const headerId = `${baseId}-${item.id}-header`;
        const panelId = `${baseId}-${item.id}-panel`;

        return (
          <div
            key={item.id}
            className={cn(
              'bg-card overflow-hidden rounded-xl border transition-colors duration-200',
              isOpen ? 'border-primary/40 shadow-2' : 'border-border shadow-1',
            )}
          >
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                // Clicking the open item closes it, so the set can be empty.
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="focus-visible:ring-ring flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-6 sm:py-5"
              >
                <Typography
                  as="span"
                  variant="h6"
                  className={cn(
                    'transition-colors',
                    isOpen ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {item.question}
                </Typography>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5 shrink-0 transition-transform duration-200',
                    isOpen
                      ? 'text-primary rotate-180'
                      : 'text-muted-foreground rotate-0',
                  )}
                />
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: reduced ? 0 : 0.22,
                    ease: 'easeOut',
                  }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">{item.answer}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

Accordion.displayName = 'Accordion';

export default Accordion;
