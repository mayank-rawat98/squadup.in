import { fireEvent, render, screen } from '@testing-library/react';
import Drawer from './Drawer';

/* jsdom has <dialog> but not its modal methods. */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

describe('Drawer', () => {
  it('opens as a labelled dialog and renders its content only while open', () => {
    const { rerender } = render(
      <Drawer open={false} onClose={jest.fn()} label="Navigation">
        <a href="/dashboard">Dashboard</a>
      </Drawer>,
    );
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();

    rerender(
      <Drawer open onClose={jest.fn()} label="Navigation">
        <a href="/dashboard">Dashboard</a>
      </Drawer>,
    );

    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('asks the parent to close on Escape', () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} label="Navigation">
        <p>Content</p>
      </Drawer>,
    );

    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('asks the parent to close on a backdrop click but not a click inside', () => {
    const onClose = jest.fn();
    render(
      <Drawer open onClose={onClose} label="Navigation">
        <p>Content</p>
      </Drawer>,
    );

    fireEvent.click(screen.getByText('Content'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores page scrolling when it closes', () => {
    const { rerender } = render(
      <Drawer open onClose={jest.fn()} label="Navigation">
        <p>Content</p>
      </Drawer>,
    );
    rerender(
      <Drawer open={false} onClose={jest.fn()} label="Navigation">
        <p>Content</p>
      </Drawer>,
    );

    expect(document.body.style.overflow).toBe('');
  });
});
