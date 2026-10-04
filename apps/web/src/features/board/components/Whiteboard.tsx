'use client';

import {
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Download,
  Eraser,
  Highlighter,
  type LucideIcon,
  MoveUpRight,
  Pen,
  Plus,
  Square,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button, cn, toast } from '@squadup.in/ui';
import type * as Y from 'yjs';
import { BOARD_DOC, WHITEBOARD_MAX_PAGES } from '../constants/board.constant';
import { useWhiteboardPages } from '../hooks/use-whiteboard-pages';
import {
  type Stroke,
  WHITEBOARD_COLOURS,
  WHITEBOARD_SIZES,
  type WhiteboardColourId,
  type WhiteboardTool,
  addPoint,
  drawStroke,
  isStroke,
  lastStrokeBy,
  setEnd,
} from '../utils/whiteboard';
import {
  drawingBounds,
  exportFileName,
  renderPagePng,
  saveFile,
} from '../utils/whiteboard-export';
import { addPage, pageLabel } from '../utils/whiteboard-pages';

const TOOLS: readonly {
  id: WhiteboardTool;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'pen', label: 'Pen', icon: Pen },
  { id: 'marker', label: 'Highlighter', icon: Highlighter },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'arrow', label: 'Arrow', icon: MoveUpRight },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
];

const SIZE_DOT = { 2: 'h-1 w-1', 4: 'h-2 w-2', 8: 'h-3 w-3' } as const;
const SWATCH_BG: Record<WhiteboardColourId, string> = {
  ink: 'bg-foreground',
  violet: 'bg-primary',
  pink: 'bg-presence-1',
  green: 'bg-presence-2',
  blue: 'bg-presence-3',
  orange: 'bg-presence-4',
};

export interface WhiteboardProps {
  doc: Y.Doc;
  youId: string;
  /** The room's name, for the downloaded file. */
  roomName: string;
  /** The page you're looking at; each person picks their own. */
  pageId: string;
  onPageChange: (pageId: string) => void;
  /** How many others are on each page, by page id. */
  othersOnPage: Readonly<Record<string, number>>;
  /** Names of the others drawing on this page right now. */
  drawing: readonly string[];
  /** Tells the room whether you're drawing, for everyone else's status. */
  onDrawingChange: (drawing: boolean) => void;
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Turns a design token into a CSS colour, as the element sees it now. */
function tokenColours(el: Element) {
  const styles = getComputedStyle(el);
  const token = (name: string) =>
    `hsl(${styles.getPropertyValue(name).trim()})`;
  return {
    colourOf: (id: WhiteboardColourId) =>
      token(
        WHITEBOARD_COLOURS.find((c) => c.id === id)?.token ?? '--foreground',
      ),
    background: token('--card'),
  };
}

/*
 * The room's shared whiteboard. It has pages: each page's finished strokes
 * are their own array in the document, so everyone sees them and they're
 * saved with the room. Everyone shares the pages but picks which one to look
 * at; New page adds one for everyone and takes only you there. The stroke
 * being drawn shows only on your screen until you let go, while everyone
 * else sees that you're drawing. Ink colours are design tokens, so the board
 * follows the theme.
 *
 * Drawing needs a pointer; everything else here is a real button.
 */
export default function Whiteboard({
  doc,
  youId,
  roomName,
  pageId,
  onPageChange,
  othersOnPage,
  drawing,
  onDrawingChange,
}: WhiteboardProps) {
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [colour, setColour] = useState<WhiteboardColourId>('ink');
  const [size, setSize] = useState<number>(4);
  const [canUndo, setCanUndo] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasInk, setHasInk] = useState(false);
  const [notice, setNotice] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const pages = useWhiteboardPages(doc);
  const pageIndex = Math.max(
    0,
    pages.findIndex((p) => p.id === pageId),
  );
  const strokes = useMemo(
    () => doc.getArray<Stroke>(BOARD_DOC.pageStrokes(pageId)),
    [doc, pageId],
  );

  const redraw = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const { colourOf } = tokenColours(el);
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const all = strokes.toArray().filter(isStroke);
    for (const stroke of all) drawStroke(ctx, stroke, colourOf);
    if (current.current) drawStroke(ctx, current.current, colourOf);
    setIsEmpty(all.length === 0);
    setHasInk(drawingBounds(all) !== null);
    setCanUndo(lastStrokeBy(all, youId) !== -1);
  }, [strokes, youId]);

  // Redraw on every change to the shared strokes.
  useEffect(() => {
    redraw();
    strokes.observe(redraw);
    return () => strokes.unobserve(redraw);
  }, [strokes, redraw]);

  // Keep the canvas at the panel's size, sharp on high-density screens.
  useEffect(() => {
    const box = wrap.current;
    const el = canvas.current;
    if (!box || !el) return;
    const fit = () => {
      const { width, height } = box.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      redraw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [redraw]);

  const at = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top] as const;
  };

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const [x, y] = at(event);
    current.current = {
      id: newId(),
      author: youId,
      tool,
      colour,
      size,
      points: addPoint([], x, y),
    };
    onDrawingChange(true);
    redraw();
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const stroke = current.current;
    if (!stroke) return;
    const [x, y] = at(event);
    const shape = stroke.tool === 'rect' || stroke.tool === 'arrow';
    current.current = {
      ...stroke,
      points: shape
        ? setEnd(stroke.points, x, y)
        : addPoint(stroke.points, x, y),
    };
    redraw();
  };

  const up = () => {
    const stroke = current.current;
    current.current = null;
    onDrawingChange(false);
    if (stroke) strokes.push([stroke]);
  };

  const undo = () => {
    const index = lastStrokeBy(strokes.toArray(), youId);
    if (index !== -1) strokes.delete(index, 1);
  };

  const clear = () => {
    if (
      window.confirm(
        `Clear ${pageLabel(pageIndex)} for everyone in the room? This removes every drawing on it and can't be undone.`,
      )
    ) {
      strokes.delete(0, strokes.length);
    }
  };

  const newPage = () => {
    const page = addPage(doc, newId());
    if (page) {
      onPageChange(page.id);
      setNotice(`${pageLabel(pages.length)} added. You're on it now.`);
    }
  };

  const download = async () => {
    const el = canvas.current;
    if (!el) return;
    const { colourOf, background } = tokenColours(el);
    try {
      const png = await renderPagePng(
        strokes.toArray().filter(isStroke),
        colourOf,
        background,
        window.devicePixelRatio || 1,
      );
      if (!png) {
        toast.error('There is nothing on this page to download yet.');
        return;
      }
      saveFile(png, exportFileName(roomName, pageIndex + 1));
      toast.success(`${pageLabel(pageIndex)} saved as an image.`);
    } catch {
      toast.error("We couldn't create the image. Please try again.");
    }
  };

  const atPageLimit = pages.length >= WHITEBOARD_MAX_PAGES;

  const pill = (active: boolean) =>
    cn(
      'focus-visible:ring-ring inline-flex cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none',
      active
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="toolbar"
        aria-label="Drawing tools"
        className="border-border bg-card flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2"
      >
        <div role="group" aria-label="Tool" className="flex gap-0.5">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className={cn(pill(tool === id), 'h-9 w-9')}
            >
              <Icon aria-hidden="true" className="h-4.5 w-4.5" />
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="bg-border h-6 w-px" />
        <div role="group" aria-label="Colour" className="flex gap-1">
          {WHITEBOARD_COLOURS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={colour === c.id}
              onClick={() => {
                setColour(c.id);
                if (tool === 'eraser') setTool('pen');
              }}
              className={cn(
                'border-card focus-visible:ring-ring h-7 w-7 cursor-pointer rounded-full border-2 focus-visible:ring-2 focus-visible:outline-none',
                SWATCH_BG[c.id],
                colour === c.id ? 'ring-primary ring-2' : 'ring-border ring-1',
              )}
            />
          ))}
        </div>
        <span aria-hidden="true" className="bg-border h-6 w-px" />
        <div role="group" aria-label="Stroke size" className="flex gap-0.5">
          {WHITEBOARD_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-label={s.label}
              aria-pressed={size === s.value}
              onClick={() => setSize(s.value)}
              className={cn(pill(size === s.value), 'h-8 w-8')}
            >
              <span
                aria-hidden="true"
                className={cn('bg-foreground rounded-full', SIZE_DOT[s.value])}
              />
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            aria-live="polite"
            className="text-muted-foreground text-caption"
          >
            {drawing.length === 1
              ? `${drawing[0]} is drawing`
              : drawing.length > 1
                ? `${drawing.length} people are drawing`
                : null}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
          >
            <Undo2 aria-hidden="true" className="h-4 w-4" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void download()}
            disabled={!hasInk}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={isEmpty}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Clear page
          </Button>
        </div>
      </div>
      <nav
        aria-label="Whiteboard pages"
        className="border-border bg-card flex items-center gap-2 border-b px-3 py-1.5"
      >
        <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {pages.map((page, index) => {
            const others = othersOnPage[page.id] ?? 0;
            const active = page.id === pageId;
            return (
              <li key={page.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onPageChange(page.id)}
                  className={cn(
                    pill(active),
                    'text-body-sm h-8 gap-1.5 px-2.5 font-medium',
                  )}
                >
                  {pageLabel(index)}
                  {others > 0 ? (
                    <span className="bg-primary text-primary-foreground text-caption inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1">
                      <span aria-hidden="true">{others}</span>
                      <span className="sr-only">
                        , {others} {others === 1 ? 'other person' : 'others'}{' '}
                        here
                      </span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          onClick={newPage}
          disabled={atPageLimit}
          title={
            atPageLimit
              ? `A whiteboard can have up to ${WHITEBOARD_MAX_PAGES} pages.`
              : undefined
          }
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          New page
        </Button>
        <span role="status" className="sr-only">
          {notice}
        </span>
      </nav>
      <div
        ref={wrap}
        className="bg-card relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(var(--color-border)_1px,transparent_1.2px)] bg-size-[22px_22px]"
      >
        <canvas
          ref={canvas}
          aria-label="Shared whiteboard. Draw with a mouse, pen or finger; everyone in the room sees it."
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}
