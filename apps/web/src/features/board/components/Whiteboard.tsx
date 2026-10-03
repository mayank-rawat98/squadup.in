'use client';

import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Eraser,
  Highlighter,
  type LucideIcon,
  MoveUpRight,
  Pen,
  Square,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button, cn } from '@squadup.in/ui';
import type * as Y from 'yjs';
import { BOARD_DOC } from '../constants/board.constant';
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
  /** Names of the others drawing right now. */
  drawing: readonly string[];
  /** Tells the room whether you're drawing, for everyone else's status. */
  onDrawingChange: (drawing: boolean) => void;
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/*
 * The room's shared whiteboard. Finished strokes go into the document's
 * `strokes` array, so everyone sees them and they're saved with the room;
 * the stroke being drawn shows only on your screen until you let go, while
 * everyone else sees that you're drawing. Ink colours are design tokens, so
 * the board follows the theme.
 *
 * Drawing needs a pointer; everything else here is a real button.
 */
export default function Whiteboard({
  doc,
  youId,
  drawing,
  onDrawingChange,
}: WhiteboardProps) {
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [colour, setColour] = useState<WhiteboardColourId>('ink');
  const [size, setSize] = useState<number>(4);
  const [canUndo, setCanUndo] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const strokes = doc.getArray<Stroke>(BOARD_DOC.strokes);

  const redraw = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const styles = getComputedStyle(el);
    const colourOf = (id: WhiteboardColourId) => {
      const token =
        WHITEBOARD_COLOURS.find((c) => c.id === id)?.token ?? '--foreground';
      return `hsl(${styles.getPropertyValue(token).trim()})`;
    };
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const all = strokes.toArray().filter(isStroke);
    for (const stroke of all) drawStroke(ctx, stroke, colourOf);
    if (current.current) drawStroke(ctx, current.current, colourOf);
    setIsEmpty(all.length === 0);
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
        "Clear the whiteboard for everyone in the room? This removes every drawing and can't be undone.",
      )
    ) {
      strokes.delete(0, strokes.length);
    }
  };

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
            onClick={clear}
            disabled={isEmpty}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Clear for everyone
          </Button>
        </div>
      </div>
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
