'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import Button, { type ButtonProps } from '../atoms/Button';

/*
 * Copies text and says so in its own label for a moment, so the confirmation
 * is read out with the button rather than only shown as a tick.
 */

const COPIED_FOR_MS = 2000;

export interface CopyButtonProps
  extends Pick<ButtonProps, 'variant' | 'size' | 'className'> {
  text: string;
  label: string;
}

const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({ text, label, variant = 'outline', size = 'sm', className }, ref) => {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS);
      } catch {
        toast.error("Couldn't copy. Select the text and copy it yourself.");
      }
    };

    const Icon = copied ? Check : Copy;
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        onClick={copy}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        {copied ? 'Copied' : label}
      </Button>
    );
  },
);
CopyButton.displayName = 'CopyButton';

export default CopyButton;
