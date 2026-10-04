'use client';

import { forwardRef } from 'react';
import {
  OTPInput,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
  type SlotProps,
} from 'input-otp';
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
 *
 * `charset="alphanumeric"` is for codes people read to each other, such as a
 * room ID: letters and digits, upper-cased as they're typed, with the normal
 * keyboard instead of the keypad and no one-time-code autofill.
 */

const DEFAULT_LENGTH = 6;

const stripSeparators = (pasted: string) => pasted.replace(/[\s-]/g, '');
const upperCase = (value: string) => value.toUpperCase();

export interface OtpInputProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Called once every slot is filled, with the full code. */
  onComplete?: (value: string) => void;
  length?: number;
  /** Digits only (the default), or letters and digits shown upper-case. */
  charset?: 'digits' | 'alphanumeric';
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
      charset = 'digits',
      className,
      onChange,
      onComplete,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const invalid = Boolean(ariaInvalid);
    const letters = charset === 'alphanumeric';
    const normalize = letters ? upperCase : (value: string) => value;

    return (
      <OTPInput
        ref={ref}
        maxLength={length}
        pattern={letters ? REGEXP_ONLY_DIGITS_AND_CHARS : REGEXP_ONLY_DIGITS}
        inputMode={letters ? 'text' : 'numeric'}
        autoComplete={letters ? 'off' : 'one-time-code'}
        autoCapitalize={letters ? 'characters' : undefined}
        spellCheck={letters ? false : undefined}
        pasteTransformer={(pasted) => normalize(stripSeparators(pasted))}
        onChange={onChange ? (value) => onChange(normalize(value)) : undefined}
        onComplete={
          onComplete ? (value) => onComplete(normalize(value)) : undefined
        }
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
