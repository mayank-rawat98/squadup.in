import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import CopyButton from './CopyButton';

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

describe('CopyButton', () => {
  const writeText = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  afterEach(() => jest.useRealTimers());

  it('copies the text and says so in its label, then goes back', async () => {
    render(<CopyButton text="K7Q2M" label="Copy room ID" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy room ID' }));
    });

    expect(writeText).toHaveBeenCalledWith('K7Q2M');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();

    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy room ID' })).toBeTruthy();
  });

  it('tells the user how to copy by hand when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<CopyButton text="K7Q2M" label="Copy room ID" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy room ID' }));
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't copy. Select the text and copy it yourself.",
    );
    expect(screen.getByRole('button', { name: 'Copy room ID' })).toBeTruthy();
  });
});
