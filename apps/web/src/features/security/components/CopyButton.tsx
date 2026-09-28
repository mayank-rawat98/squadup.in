'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps, toast } from '@squadup.in/ui';

/*
 * Copies text and says so in its own label for a moment, so the confirmation
 * is read out with the button rather than only shown as a tick.
 */

export interface CopyButtonProps extends Pick<ButtonProps, 'variant' | 'size'> {
  text: string;
  label: string;
}

export default function CopyButton({
  text,
  label,
  variant = 'outline',
  size = 'sm',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it yourself.");
    }
  };

  const Icon = copied ? Check : Copy;
  return (
    <Button variant={variant} size={size} onClick={copy}>
      <Icon aria-hidden="true" className="h-4 w-4" />
      {copied ? 'Copied' : label}
    </Button>
  );
}
