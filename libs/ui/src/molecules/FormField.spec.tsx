import { render, screen } from '@testing-library/react';
import Input from '../atoms/Input';
import FormField from './FormField';

describe('FormField', () => {
  it('labels the control and leaves it valid when there is no error', () => {
    render(
      <FormField id="email" label="Email">
        {(control) => <Input {...control} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('marks the control invalid and points it at the announced error', () => {
    render(
      <FormField id="email" label="Email" error="Enter a valid email address">
        {(control) => <Input {...control} />}
      </FormField>,
    );

    const input = screen.getByLabelText('Email');
    const alert = screen.getByRole('alert');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    expect(alert.id).toBe('email-error');
    expect(alert.textContent).toBe('Enter a valid email address');
  });

  it('describes the control by both the hint and the error', () => {
    render(
      <FormField
        id="password"
        label="Password"
        hint="At least 8 characters"
        error="Too short"
      >
        {(control) => <Input {...control} />}
      </FormField>,
    );

    expect(
      screen.getByLabelText('Password').getAttribute('aria-describedby'),
    ).toBe('password-hint password-error');
  });
});
