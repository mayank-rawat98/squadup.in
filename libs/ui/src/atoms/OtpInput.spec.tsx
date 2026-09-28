import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import OtpInput from './OtpInput';

function ControlledOtp({
  onComplete,
}: {
  onComplete?: (code: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <OtpInput
      aria-label="Verification code"
      value={value}
      onChange={setValue}
      onComplete={onComplete}
    />
  );
}

function paste(input: HTMLElement, text: string) {
  fireEvent.paste(input, {
    clipboardData: {
      getData: (format: string) => (format === 'text/plain' ? text : ''),
    },
  });
}

describe('OtpInput', () => {
  it('accepts a pasted six-digit code and reports it complete', () => {
    const onComplete = jest.fn();
    render(<ControlledOtp onComplete={onComplete} />);
    const input = screen.getByLabelText('Verification code');

    paste(input, '123456');

    expect(input).toHaveProperty('value', '123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('strips spaces and dashes from a pasted code', () => {
    render(<ControlledOtp />);
    const input = screen.getByLabelText('Verification code');

    paste(input, ' 123-456 ');

    expect(input).toHaveProperty('value', '123456');
  });

  it('rejects a pasted code that contains letters', () => {
    const onComplete = jest.fn();
    render(<ControlledOtp onComplete={onComplete} />);
    const input = screen.getByLabelText('Verification code');

    paste(input, '12a456');

    expect(input).toHaveProperty('value', '');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ignores a typed non-digit', () => {
    render(<ControlledOtp />);
    const input = screen.getByLabelText('Verification code');

    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '1x' } });

    expect(input).toHaveProperty('value', '1');
  });

  it('allows no more than six digits', () => {
    render(<ControlledOtp />);
    const input = screen.getByLabelText('Verification code');

    expect(input).toHaveProperty('maxLength', 6);
  });

  it('asks for the numeric keypad and one-time-code autofill', () => {
    render(<ControlledOtp />);
    const input = screen.getByLabelText('Verification code');

    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
  });
});
