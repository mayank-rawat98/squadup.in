import { fireEvent, render, screen } from '@testing-library/react';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  it('hides the password until the toggle is pressed', () => {
    render(<PasswordInput aria-label="Password" />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input.getAttribute('type')).toBe('password');

    fireEvent.click(toggle);

    expect(input.getAttribute('type')).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('never submits the form it sits in', () => {
    render(<PasswordInput aria-label="Password" />);

    expect(
      screen
        .getByRole('button', { name: 'Show password' })
        .getAttribute('type'),
    ).toBe('button');
  });
});
