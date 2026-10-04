'use client';

import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button, Spinner, cn } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { BOARD_MESSAGE_MAX_LENGTH } from '../constants/board.constant';
import type { BoardMessage } from '../types/board.types';
import { chatTime } from '../utils/chat-time';
import { type PresenceColour, presenceColour } from '../utils/presence';
import MemberAvatar from './MemberAvatar';

export interface ChatPanelProps {
  id: string;
  messages: readonly BoardMessage[];
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onSend: (body: string) => Promise<void>;
  live: boolean;
  /** Each member's presence colour, by user id. */
  colourOf: (userId: string) => PresenceColour | undefined;
  /** Who else is typing right now. */
  typing: readonly string[];
  /** Tells the room whether you're typing, for everyone else's indicator. */
  onTypingChange: (typing: boolean) => void;
  className?: string;
}

const TYPING_IDLE_MS = 3000;
/** Within this distance of the bottom counts as "reading the latest". */
const STICK_TO_BOTTOM_PX = 48;

function typingLine(names: readonly string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return 'Several people are typing…';
}

/*
 * The room's chat. Messages read top to bottom; the box to write in stays
 * pinned to the bottom of the panel however tall it is. New messages keep
 * the list scrolled to the end, unless you've scrolled up to read.
 */
export default function ChatPanel({
  id,
  messages,
  isPending,
  error,
  onRetry,
  onSend,
  live,
  colourOf,
  typing,
  onTypingChange,
  className,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const atBottom = useRef(true);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    const el = list.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(
    () => () => {
      clearTimeout(idle.current);
    },
    [],
  );

  const changeDraft = (value: string) => {
    setDraft(value);
    setSendError(null);
    clearTimeout(idle.current);
    onTypingChange(value.trim().length > 0);
    idle.current = setTimeout(() => onTypingChange(false), TYPING_IDLE_MS);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend(body);
      setDraft('');
      clearTimeout(idle.current);
      onTypingChange(false);
      atBottom.current = true;
    } catch (err: unknown) {
      // onSend rejects with a reason written for the user.
      setSendError(
        err instanceof Error
          ? err.message
          : "Your message didn't send. Try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div id={id} className={cn('flex min-h-0 flex-col', className)}>
      {isPending ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <Spinner label="Loading messages" />
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-start gap-2 p-4">
          <p className="text-body-sm">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground flex-1 p-4 text-body-sm">
          No messages yet. Say hello to your squad.
        </p>
      ) : (
        <ol
          ref={list}
          aria-label="Messages"
          aria-live="polite"
          onScroll={(event) => {
            const el = event.currentTarget;
            atBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight <
              STICK_TO_BOTTOM_PX;
          }}
          className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5"
        >
          {messages.map((message) => (
            <li key={message.id} className="flex items-start gap-2.5">
              <MemberAvatar
                name={message.author.name}
                colour={colourOf(message.author.id) ?? presenceColour(0)}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-body-sm font-semibold">
                    {message.author.name}
                  </span>
                  <time
                    dateTime={message.createdAt}
                    title={new Date(message.createdAt).toLocaleString('en-IN')}
                    className="text-muted-foreground text-micro"
                  >
                    {chatTime(new Date(message.createdAt))}
                  </time>
                </p>
                <p className="text-body-sm mt-0.5 break-words whitespace-pre-wrap">
                  {message.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p
        aria-live="polite"
        className="text-muted-foreground min-h-5 shrink-0 px-3.5 text-caption"
      >
        {typing.length ? typingLine(typing) : null}
      </p>

      <form
        onSubmit={submit}
        className="border-border flex shrink-0 flex-col gap-1.5 border-t p-2.5"
      >
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Message the room
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(event) => changeDraft(event.target.value)}
            maxLength={BOARD_MESSAGE_MAX_LENGTH}
            autoComplete="off"
            placeholder={live ? 'Message the room' : 'Reconnecting…'}
            aria-invalid={Boolean(sendError)}
            aria-describedby={sendError ? errorId : undefined}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring aria-invalid:border-destructive h-10 min-w-0 flex-1 rounded-lg border px-3 text-body-sm focus-visible:ring-2 focus-visible:outline-none"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!live || sending || !draft.trim()}
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        {sendError ? (
          <p
            id={errorId}
            role="alert"
            className="text-destructive text-caption"
          >
            {sendError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
