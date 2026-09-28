'use client';

import { forwardRef } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp';
import { cn } from '../utils';

/*
 * One real <input> underneath, drawn as separate slots by input-otp. That's
 * what makes paste, autofill from an SMS or mail app (`one-time-code`) and the
 * platform's numeric keypad work, which six separate inputs never quite do.
 *
 * `pattern` rejects anything that isn't a digit, including a pasted code with
 * letters in it. Spaces and dashes are stripped from a paste first, because
 * codes copied out of an email often arrive as "123 456". Slots are visual
 * only; the input carries the label.
 */

const DEFAULT_LENGTH = 6;

const stripSeparators = (pasted: string) => pasted.replace(/[\s-]/g, '');

export interface OtpInputProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Called once every slot is filled, with the full code. */
  onComplete?: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  className?: string;
}

function Slot({
  char,
  isActive,
  hasFakeCaret,
  invalid,
}: SlotProps & { invalid: boolean }) {
  return (
    <div
      className={cn(
        'border-input bg-card text-foreground relative flex h-12 w-10 items-center justify-center rounded-md border text-h6 font-semibold shadow-1 transition-[border-color,box-shadow] xs:w-12',
        invalid && 'border-destructive',
        isActive &&
          (invalid
            ? 'ring-destructive ring-offset-background ring-2 ring-offset-2'
            : 'ring-ring ring-offset-background ring-2 ring-offset-2'),
      )}
    >
      {char}
      {hasFakeCaret ? (
        <span
          aria-hidden="true"
          className="bg-foreground absolute h-5 w-px animate-pulse motion-reduce:animate-none"
        />
      ) : null}
    </div>
  );
}

const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(
  (
    {
      length = DEFAULT_LENGTH,
      className,
      onChange,
      onComplete,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const invalid = Boolean(ariaInvalid);

    return (
      <OTPInput
        ref={ref}
        maxLength={length}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        pasteTransformer={stripSeparators}
        onChange={onChange}
        onComplete={onComplete}
        aria-invalid={ariaInvalid}
        containerClassName={cn(
          'flex items-center gap-2 has-[:disabled]:opacity-50',
          className,
        )}
        render={({ slots }) => (
          <div className="flex items-center gap-2">
            {slots.map((slot, index) => (
              <Slot key={index} {...slot} invalid={invalid} />
            ))}
          </div>
        )}
        {...props}
      />
    );
  },
);
OtpInput.displayName = 'OtpInput';

export default OtpInput;
