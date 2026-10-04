'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  CopyButton,
  LogoMark,
  buttonVariants,
  cn,
  inputVariants,
} from '@squadup.in/ui';
import {
  BOARD_DOC,
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
import { countOthersOnPages } from '../utils/whiteboard-pages';
import ChatPanel from './ChatPanel';
import ConsolePanel from './ConsolePanel';
import CodeEditor from './editor/LazyCodeEditor';
import MembersList from './MembersList';
import PanelToggle from './PanelToggle';
import ResizeHandle from './ResizeHandle';
import RoomSandbox from './RoomSandbox';
import Whiteboard from './Whiteboard';

export interface RoomWorkspaceProps {
  board: BoardDetail;
  you: { id: string; name: string };
  /** Whether the reactSandbox flag reaches you, which adds the React tab. */
  sandboxEnabled?: boolean;
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
export default function RoomWorkspace({
  board,
  you,
  sandboxEnabled = false,
}: RoomWorkspaceProps) {
  const connection = useBoardConnection(board.code);
  const peers = usePeers(connection?.awareness);
  const [language, setLanguage] = useSharedLanguage(
    connection?.doc,
    board.language,
  );
  const lang = boardLanguage(language);
  const [view, setView] = useState<BoardView>('code');
  const [drawing, setDrawing] = useState(false);
  const [pageId, setPageId] = useState<string>(BOARD_DOC.firstPageId);
  const [caretLine, setCaretLine] = useState<number>();
  const [projectPresence, setProjectPresence] = useState<{
    file?: string;
    line?: number;
  }>({});
  // The project and its preview load on first visit, then stay running.
  const [sandboxOpened, setSandboxOpened] = useState(false);
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
  const codePanelId = useId();
  const boardPanelId = useId();
  const sandboxPanelId = useId();
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
          page: pageId,
          file: view === 'sandbox' ? projectPresence.file : undefined,
          line: view === 'sandbox' ? projectPresence.line : caretLine,
          drawing,
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
  // Following stops by itself when the person leaves, and switches tab with them.
  const followedView = followed?.view;
  const followedPage = followed?.page;
  useEffect(() => {
    if (following && !followedView) setFollowing(null);
    // Without the React tab, following someone into it keeps your view.
    if (followedView && (followedView !== 'sandbox' || sandboxEnabled)) {
      setView(followedView);
    }
  }, [following, followedView, sandboxEnabled]);
  useEffect(() => {
    if (view === 'sandbox') setSandboxOpened(true);
  }, [view]);
  const onProjectPresence = useCallback(
    (presence: { file?: string; line?: number }) =>
      setProjectPresence(presence),
    [],
  );
  useEffect(() => {
    if (followedPage) setPageId(followedPage);
  }, [followedPage]);

  const typingNames = [
    ...new Set(peers.filter((p) => p.typing).map((p) => p.user.name)),
  ];
  // Drawing on another page doesn't change what you see, so it isn't news here.
  const drawingNames = [
    ...new Set(
      peers
        .filter(
          (p) => p.drawing && (p.page ?? BOARD_DOC.firstPageId) === pageId,
        )
        .map((p) => p.user.name),
    ),
  ];
  const othersOnPage = countOthersOnPages(peers, you.id);
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
          <div
            role="tablist"
            aria-label="Board view"
            className="bg-muted flex gap-0.5 rounded-lg p-0.5"
          >
            {(
              [
                ['code', 'Code', codePanelId],
                ['board', 'Whiteboard', boardPanelId],
                ...(sandboxEnabled
                  ? ([['sandbox', 'React', sandboxPanelId]] as const)
                  : []),
              ] as const
            ).map(([id, label, panel]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                aria-controls={panel}
                onClick={() => setView(id)}
                className={cn(
                  'focus-visible:ring-ring h-8 cursor-pointer rounded-md px-3.5 text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  view === id
                    ? 'bg-card text-foreground shadow-1'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {view === 'code' ? (
            <>
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
            </>
          ) : null}
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

        <div
          id={codePanelId}
          role="tabpanel"
          aria-label="Code"
          hidden={view !== 'code'}
          className="min-h-0 flex-1"
        >
          {connection ? (
            <CodeEditor
              text={connection.doc.getText(BOARD_DOC.code(language))}
              awareness={connection.awareness}
              language={language}
              label={`Shared code, ${lang.label}`}
              revealLine={followed?.view === 'code' ? followed.line : undefined}
              onCaretLine={setCaretLine}
            />
          ) : null}
        </div>
        <div
          id={boardPanelId}
          role="tabpanel"
          aria-label="Whiteboard"
          hidden={view !== 'board'}
          className="min-h-0 flex-1"
        >
          {connection && view === 'board' ? (
            <Whiteboard
              doc={connection.doc}
              youId={you.id}
              roomName={board.name}
              pageId={pageId}
              onPageChange={setPageId}
              othersOnPage={othersOnPage}
              drawing={drawingNames}
              onDrawingChange={setDrawing}
            />
          ) : null}
        </div>

        {sandboxEnabled ? (
          <div
            id={sandboxPanelId}
            role="tabpanel"
            aria-label="React project"
            hidden={view !== 'sandbox'}
            className="min-h-0 flex-1"
          >
            {connection && me && sandboxOpened ? (
              <RoomSandbox
                socket={connection.socket}
                code={board.code}
                roomName={board.name}
                user={{
                  name: you.name,
                  color: me.colour.css,
                  colorLight: me.colour.cssFaded,
                }}
                revealFile={
                  followed?.view === 'sandbox' ? followed.file : undefined
                }
                revealLine={
                  followed?.view === 'sandbox' ? followed.line : undefined
                }
                onPresence={onProjectPresence}
              />
            ) : null}
          </div>
        ) : null}

        {view === 'code' ? (
          <>
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
          </>
        ) : null}
      </main>
    </div>
  );
}
