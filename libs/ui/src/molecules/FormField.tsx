import type { ReactNode } from 'react';
import Label from '../atoms/Label';
import FieldError from '../atoms/FieldError';
import Typography from '../atoms/Typography';
import { cn } from '../utils';

/*
 * Label, control, hint and error for one field, with the ids between them
 * wired up in one place. The control comes in as a render function so it can
 * be any input while still receiving the right `id`, `aria-invalid` and
 * `aria-describedby`; getting those three wrong is how a form ends up
 * announcing nothing to a screen reader.
 */

export interface FormFieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

export interface FormFieldProps {
  id: string;
  label: ReactNode;
  /** The validation message. The field is marked invalid while it's set. */
  error?: string;
  /** Guidance shown under the field, such as a password rule. */
  hint?: ReactNode;
  required?: boolean;
  /** Sits on the label row, opposite the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
  className?: string;
  children: (control: FormFieldControlProps) => ReactNode;
}

function FormField({
  id,
  label,
  error,
  hint,
  required,
  labelAction,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
        {labelAction}
      </div>

      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}

      {hint ? (
        <Typography
          id={hintId}
          variant="caption"
          className="text-muted-foreground"
        >
          {hint}
        </Typography>
      ) : null}

      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

FormField.displayName = 'FormField';

export default FormField;
