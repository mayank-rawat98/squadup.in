'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  LogoMark,
  Spinner,
  buttonVariants,
  cn,
  inputVariants,
} from '@squadup.in/ui';
import {
  BOARD_LANGUAGES,
  BOARD_PATH,
  BOARD_QUERY_KEYS,
} from '../constants/board.constant';
import { useBoardChat } from '../hooks/use-board-chat';
import { useBoardConnection } from '../hooks/use-board-connection';
import { usePanelSize } from '../hooks/use-panel-size';
import {
  type BoardView,
  useLocalPresence,
  usePeers,
} from '../hooks/use-presence';
import { useRoomConsole } from '../hooks/use-room-console';
import { useSharedLanguage } from '../hooks/use-shared-language';
import type { BoardDetail, BoardLanguageId } from '../types/board.types';
import { boardLanguage } from '../utils/board-language';
import { type RoomMember, roomMembers } from '../utils/room-members';
import ChatPanel from './ChatPanel';
import ConsolePanel from './ConsolePanel';
import MembersList from './MembersList';
import PanelToggle from './PanelToggle';
import ResizeHandle from './ResizeHandle';

/* CodeMirror is client-only and sizeable; load it with the room, not the app. */
const CodeEditor = dynamic(() => import('./editor/CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Loading the editor" />
    </div>
  ),
});

export interface RoomWorkspaceProps {
  board: BoardDetail;
  you: { id: string; name: string };
}

const STATUS_BADGE = {
  connecting: { label: 'Connecting…', variant: 'outline' },
  live: { label: 'Live', variant: 'success' },
  reconnecting: { label: 'Reconnecting…', variant: 'warning' },
  refused: { label: 'Not connected', variant: 'outline' },
} as const;

/*
 * The room, laid out as the "squad bench": room, people and chat on the
 * left; the shared editor and console on the right. Each panel edge can be
 * dragged or moved with the arrow keys, and the people list, chat and
 * console can each be collapsed; whatever stays open takes the space. Below `lg` the panels stack and the page scrolls.
 */
export default function RoomWorkspace({ board, you }: RoomWorkspaceProps) {
  const connection = useBoardConnection(board.code);
  const peers = usePeers(connection?.awareness);
  const [language, setLanguage] = useSharedLanguage(
    connection?.doc,
    board.language,
  );
  const lang = boardLanguage(language);
  const [view] = useState<BoardView>('code');
  const [caretLine, setCaretLine] = useState<number>();
  const [following, setFollowing] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [typing, setTyping] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [stdin, setStdin] = useState('');
  const roomConsole = useRoomConsole();
  const queryClient = useQueryClient();
  const membersId = useId();
  const chatId = useId();
  const live = connection?.status === 'live';
  const chat = useBoardChat(board.code, connection?.socket, live);

  const side = usePanelSize({
    initial: 320,
    min: 240,
    max: 440,
    axis: 'x',
    direction: 1,
  });
  const membersSize = usePanelSize({
    initial: 230,
    min: 72,
    max: 480,
    axis: 'y',
    direction: 1,
  });
  const consoleSize = usePanelSize({
    initial: 210,
    min: 110,
    max: 520,
    axis: 'y',
    direction: -1,
  });

  const members = useMemo(
    () => roomMembers(board.members, peers, you.id),
    [board.members, peers, you.id],
  );
  const me = members.find((m) => m.isYou);

  useLocalPresence(
    connection?.awareness,
    me
      ? {
          user: {
            id: you.id,
            name: you.name,
            color: me.colour.css,
            colorLight: me.colour.cssFaded,
          },
          view,
          line: caretLine,
          typing,
        }
      : null,
  );

  // Someone new is in the room: refresh the member list so they get a name and colour.
  const unknown = peers
    .map((p) => p.user.id)
    .filter((id) => !board.members.some((m) => m.id === id))
    .sort()
    .join(',');
  useEffect(() => {
    if (!unknown) return;
    void queryClient.invalidateQueries({
      queryKey: BOARD_QUERY_KEYS.detail(board.code),
    });
  }, [unknown, board.code, queryClient]);

  const followed = following
    ? peers.find((p) => p.user.id === following)
    : undefined;
  const followedMember = members.find((m) => m.id === following);
  // Following stops by itself when the person leaves.
  useEffect(() => {
    if (following && !followed) setFollowing(null);
  }, [following, followed]);

  const typingNames = [
    ...new Set(peers.filter((p) => p.typing).map((p) => p.user.name)),
  ];
  const colourOf = (userId: string) =>
    members.find((m) => m.id === userId)?.colour;

  const host = board.members.find((m) => m.role === 'host');
  const status = STATUS_BADGE[connection?.status ?? 'connecting'];

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <aside
        aria-label="Room, people and chat"
        className="bg-muted/40 border-border flex w-full shrink-0 flex-col border-b lg:w-(--side-w) lg:border-r lg:border-b-0"
        style={
          {
            '--side-w': `${side.size}px`,
            '--members-h': `${membersSize.size}px`,
          } as React.CSSProperties
        }
      >
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
          <LogoMark className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-body-sm truncate font-semibold">
              {board.name}
            </h1>
            {host ? (
              <p className="text-muted-foreground text-caption truncate">
                Hosted by {host.id === you.id ? 'you' : host.name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-border bg-card mx-3 mb-2.5 flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-caption">
              Room ID, needed to join
            </p>
            <p className="font-mono text-h6 tracking-[0.16em]">{board.code}</p>
          </div>
          <CopyButton text={board.code} label="Copy" variant="secondary" />
        </div>

        <div className="flex items-center px-2">
          <PanelToggle
            expanded={membersOpen}
            onToggle={() => setMembersOpen((open) => !open)}
            controls={membersId}
            className="text-muted-foreground text-caption"
          >
            In this room · {members.filter((m) => m.online).length} of{' '}
            {members.length}
          </PanelToggle>
        </div>
        {membersOpen ? (
          <MembersList
            id={membersId}
            members={members}
            followingId={following}
            onFollow={(member: RoomMember | null) =>
              setFollowing(member?.id ?? null)
            }
            className={chatOpen ? 'lg:h-(--members-h)' : 'flex-1'}
          />
        ) : null}
        {membersOpen && chatOpen ? (
          <ResizeHandle
            {...membersSize.separator}
            aria-label="Resize the people list and chat"
            className="hidden lg:block"
          />
        ) : null}

        <section
          aria-label="Chat"
          className={cn(
            'border-border bg-card flex flex-col border-t',
            chatOpen ? 'min-h-88 flex-1 lg:min-h-0' : 'mt-auto',
          )}
        >
          <div className="flex h-11 shrink-0 items-center px-2">
            <PanelToggle
              expanded={chatOpen}
              onToggle={() => setChatOpen((open) => !open)}
              controls={chatId}
            >
              Chat
            </PanelToggle>
          </div>
          {chatOpen ? (
            <ChatPanel
              id={chatId}
              messages={chat.messages}
              isPending={chat.isPending}
              error={chat.error}
              onRetry={chat.retry}
              onSend={chat.send}
              live={live}
              colourOf={colourOf}
              typing={typingNames}
              onTypingChange={setTyping}
              className="border-border flex-1 border-t"
            />
          ) : null}
        </section>
      </aside>

      <ResizeHandle
        {...side.separator}
        aria-label="Resize the room panel"
        className="hidden lg:block"
      />

      <main className="flex h-dvh min-w-0 flex-1 flex-col lg:h-auto">
        <div className="border-border bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2">
          <span className="bg-accent text-accent-foreground rounded-md px-2.5 py-1 font-mono text-caption">
            {lang.file}
          </span>
          <label
            htmlFor="board-language"
            className="text-muted-foreground text-caption"
          >
            Language
          </label>
          <select
            id="board-language"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as BoardLanguageId)
            }
            className={inputVariants({ size: 'sm', className: 'w-auto' })}
          >
            {BOARD_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => {
              setConsoleOpen(true);
              roomConsole.run(lang, stdin);
            }}
          >
            <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
            Run {lang.file}
          </Button>
          <Badge variant={status.variant} role="status" className="ml-auto">
            {status.label}
          </Badge>
          <Link
            href={BOARD_PATH}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Leave room
          </Link>
        </div>

        {followedMember ? (
          <div
            role="status"
            className="bg-accent text-accent-foreground flex items-center gap-3 px-3 py-1.5 text-caption"
          >
            <span>
              Following {followedMember.name}. Your view moves with them.
            </span>
            <button
              type="button"
              onClick={() => setFollowing(null)}
              className="focus-visible:ring-ring ml-auto cursor-pointer rounded-md px-2 py-1 font-semibold underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Stop following
            </button>
          </div>
        ) : null}

        {connection?.status === 'refused' ? (
          <div className="p-4">
            <Alert tone="danger">{connection.error}</Alert>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          {connection ? (
            <CodeEditor
              doc={connection.doc}
              awareness={connection.awareness}
              language={language}
              label={`Shared code, ${lang.label}`}
              revealLine={followed?.view === 'code' ? followed.line : undefined}
              onCaretLine={setCaretLine}
            />
          ) : null}
        </div>

        {consoleOpen ? (
          <ResizeHandle
            {...consoleSize.separator}
            aria-label="Resize the console"
          />
        ) : null}
        <ConsolePanel
          open={consoleOpen}
          onToggle={() => setConsoleOpen((open) => !open)}
          lines={roomConsole.lines}
          onClear={roomConsole.clear}
          stdin={stdin}
          onStdinChange={setStdin}
          height={consoleSize.size}
        />
      </main>
    </div>
  );
}
