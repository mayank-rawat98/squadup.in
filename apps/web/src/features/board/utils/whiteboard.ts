/*
 * Whiteboard strokes as they're stored in the room's shared document: plain
 * objects in a Y.Array, so they sync, persist and merge like the code does.
 * Points are a flat [x0, y0, x1, y1, …] list in board pixels, rounded to a
 * tenth, which keeps a long pen stroke to a few kilobytes.
 */

export type WhiteboardTool = 'pen' | 'marker' | 'rect' | 'arrow' | 'eraser';

export interface Stroke {
  id: string;
  /** The user who drew it, so Undo only takes back your own. */
  author: string;
  tool: WhiteboardTool;
  colour: WhiteboardColourId;
  size: number;
  points: readonly number[];
}

export type WhiteboardColourId =
  | 'ink'
  | 'violet'
  | 'pink'
  | 'green'
  | 'blue'
  | 'orange';

export interface WhiteboardColour {
  id: WhiteboardColourId;
  label: string;
  /** The design token the ink takes, so it follows the theme. */
  token: string;
}

export const WHITEBOARD_COLOURS: readonly WhiteboardColour[] = [
  { id: 'ink', label: 'Ink', token: '--foreground' },
  { id: 'violet', label: 'Violet', token: '--primary' },
  { id: 'pink', label: 'Pink', token: '--presence-1' },
  { id: 'green', label: 'Green', token: '--presence-2' },
  { id: 'blue', label: 'Blue', token: '--presence-3' },
  { id: 'orange', label: 'Orange', token: '--presence-4' },
];

export const WHITEBOARD_SIZES = [
  { value: 2, label: 'Thin stroke' },
  { value: 4, label: 'Medium stroke' },
  { value: 8, label: 'Thick stroke' },
] as const;

/** Points closer than this to the last one add nothing a reader can see. */
export const MIN_POINT_GAP = 2;

export const round = (n: number) => Math.round(n * 10) / 10;

/** Appends a point to a freehand stroke unless it's too close to the last. */
export function addPoint(points: readonly number[], x: number, y: number) {
  const n = points.length;
  if (n >= 2) {
    const dx = x - points[n - 2];
    const dy = y - points[n - 1];
    if (dx * dx + dy * dy < MIN_POINT_GAP * MIN_POINT_GAP) return points;
  }
  return [...points, round(x), round(y)];
}

/** Shapes keep only their start and the current end. */
export function setEnd(points: readonly number[], x: number, y: number) {
  return [points[0], points[1], round(x), round(y)];
}

/** Where Undo should act: your newest stroke, or -1 if you have none. */
export function lastStrokeBy(strokes: readonly Stroke[], author: string) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (strokes[i].author === author) return i;
  }
  return -1;
}

export function isStroke(value: unknown): value is Stroke {
  const s = value as Stroke | null;
  return (
    typeof s?.id === 'string' &&
    typeof s.tool === 'string' &&
    Array.isArray(s.points) &&
    s.points.length >= 2
  );
}

/** Draws one stroke; `colourOf` turns a colour id into a CSS colour. */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  colourOf: (id: WhiteboardColourId) => string,
) {
  const p = stroke.points;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colourOf(stroke.colour);
  ctx.lineWidth = stroke.size;

  if (stroke.tool === 'rect' || stroke.tool === 'arrow') {
    const [x0, y0, x1 = x0, y1 = y0] = p;
    ctx.beginPath();
    if (stroke.tool === 'rect') {
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
    } else {
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const head = 8 + stroke.size * 2;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.moveTo(
        x1 - head * Math.cos(angle - 0.45),
        y1 - head * Math.sin(angle - 0.45),
      );
      ctx.lineTo(x1, y1);
      ctx.lineTo(
        x1 - head * Math.cos(angle + 0.45),
        y1 - head * Math.sin(angle + 0.45),
      );
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'marker') {
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = stroke.size * 4;
  } else if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = stroke.size * 5;
  }
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  if (p.length === 2) ctx.lineTo(p[0] + 0.1, p[1]);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.stroke();
  ctx.restore();
}
