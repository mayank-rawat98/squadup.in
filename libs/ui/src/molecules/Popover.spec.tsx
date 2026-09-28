import { fireEvent, render, screen } from '@testing-library/react';
import Popover from './Popover';

function renderPopover() {
  return render(
    <div>
      <Popover
        label="Account"
        trigger={(props) => <button {...props}>Open account</button>}
      >
        {(close) => (
          <button type="button" onClick={close}>
            Profile
          </button>
        )}
      </Popover>
      <p>Outside</p>
    </div>,
  );
}

describe('Popover', () => {
  it('is closed until the trigger is pressed', () => {
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Open account' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Profile' })).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('group', { name: 'Account' }).id).toBe(
      trigger.getAttribute('aria-controls'),
    );
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Open account' });
    fireEvent.click(trigger);
    screen.getByRole('button', { name: 'Profile' }).focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a click outside but not on a click inside', () => {
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Open account' });
    fireEvent.click(trigger);

    fireEvent.pointerDown(screen.getByRole('group', { name: 'Account' }));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('lets the content close it', () => {
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Open account' });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
