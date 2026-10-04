import { act, fireEvent, render, screen } from '@testing-library/react';
import type { BoardMessage } from '../types/board.types';
import { presenceColour } from '../utils/presence';
import ChatPanel, { type ChatPanelProps } from './ChatPanel';

const message = (id: string, body: string): BoardMessage => ({
  id,
  body,
  createdAt: '2026-10-04T10:41:00.000Z',
  author: { id: 'diya', name: 'Diya Shah', username: 'diya', avatarUrl: null },
});

function renderChat(props: Partial<ChatPanelProps> = {}) {
  const onSend = jest.fn().mockResolvedValue(undefined);
  const onTypingChange = jest.fn();
  render(
    <ChatPanel
      id="chat"
      messages={[message('1', "I'll take input parsing.")]}
      isPending={false}
      error={null}
      onRetry={jest.fn()}
      onSend={onSend}
      live
      colourOf={() => presenceColour(1)}
      typing={[]}
      onTypingChange={onTypingChange}
      {...props}
    />,
  );
  return { onSend, onTypingChange };
}

const box = () => screen.getByLabelText('Message the room');
const send = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  });

describe('ChatPanel', () => {
  it('shows who said what', () => {
    renderChat();
    expect(screen.getByText('Diya Shah')).toBeTruthy();
    expect(screen.getByText("I'll take input parsing.")).toBeTruthy();
  });

  it('sends the trimmed message, clears the box and stops "typing"', async () => {
    const { onSend, onTypingChange } = renderChat();

    fireEvent.change(box(), { target: { value: '  On it.  ' } });
    expect(onTypingChange).toHaveBeenLastCalledWith(true);
    await send();

    expect(onSend).toHaveBeenCalledWith('On it.');
    expect(box()).toHaveProperty('value', '');
    expect(onTypingChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps the draft and says why when sending fails', async () => {
    const onSend = jest
      .fn()
      .mockRejectedValue(
        new Error(
          "You're sending messages too quickly. Wait a few seconds and try again.",
        ),
      );
    renderChat({ onSend });

    fireEvent.change(box(), { target: { value: 'hello' } });
    await send();

    expect(screen.getByRole('alert').textContent).toBe(
      "You're sending messages too quickly. Wait a few seconds and try again.",
    );
    expect(box()).toHaveProperty('value', 'hello');
    expect(box().getAttribute('aria-invalid')).toBe('true');
  });

  it("can't send while the room is reconnecting", () => {
    renderChat({ live: false });
    fireEvent.change(box(), { target: { value: 'hello' } });

    expect(screen.getByRole('button', { name: 'Send message' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(box().getAttribute('placeholder')).toBe('Reconnecting…');
  });

  it('says who is typing', () => {
    renderChat({ typing: ['Kabir Mehta', 'Aarav Joshi'] });
    expect(
      screen.getByText('Kabir Mehta and Aarav Joshi are typing…'),
    ).toBeTruthy();
  });

  it('invites the first message in an empty room', () => {
    renderChat({ messages: [] });
    expect(
      screen.getByText('No messages yet. Say hello to your squad.'),
    ).toBeTruthy();
  });
});
