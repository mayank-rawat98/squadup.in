import { type Stroke, type WhiteboardColourId, drawStroke } from './whiteboard';

/*
 * Saving a whiteboard page as a PNG, in the browser. The image is cropped to
 * what's drawn, with a margin, and drawn on the board's own background so it
 * looks the same as on screen in either theme.
 */

/** Space around the drawing in the saved image, in board pixels. */
export const EXPORT_MARGIN = 24;
/** Neither side of the image goes past this, whatever the screen density. */
export const EXPORT_MAX_SIDE = 8192;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** How wide a stroke draws: highlighters and erasers are wider than their size. */
const lineWidth = (stroke: Stroke) =>
  stroke.tool === 'marker'
    ? stroke.size * 4
    : stroke.tool === 'eraser'
      ? stroke.size * 5
      : stroke.size;

/**
 * The box around everything drawn, margin included, or null when nothing is.
 * Eraser strokes only take ink away, so they never widen the box.
 */
export function drawingBounds(strokes: readonly Stroke[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    if (stroke.tool === 'eraser') continue;
    const half = lineWidth(stroke) / 2;
    for (let i = 0; i + 1 < stroke.points.length; i += 2) {
      minX = Math.min(minX, stroke.points[i] - half);
      minY = Math.min(minY, stroke.points[i + 1] - half);
      maxX = Math.max(maxX, stroke.points[i] + half);
      maxY = Math.max(maxY, stroke.points[i + 1] + half);
    }
  }
  if (minX === Infinity) return null;
  return {
    x: Math.floor(minX - EXPORT_MARGIN),
    y: Math.floor(minY - EXPORT_MARGIN),
    width: Math.ceil(maxX - minX + EXPORT_MARGIN * 2),
    height: Math.ceil(maxY - minY + EXPORT_MARGIN * 2),
  };
}

/** Pixels per board pixel: sharp on dense screens, never past the size cap. */
export function exportScale(bounds: Bounds, devicePixelRatio: number) {
  const wanted = Math.max(1, Math.min(devicePixelRatio, 2));
  const fits = EXPORT_MAX_SIDE / Math.max(bounds.width, bounds.height);
  return Math.min(wanted, fits);
}

/** "Two-sum warmup", page 2 → "two-sum-warmup-page-2.png". */
export function exportFileName(roomName: string, pageNumber: number) {
  const slug =
    roomName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'whiteboard';
  return `${slug}-page-${pageNumber}.png`;
}

/**
 * Draws the strokes onto a fresh canvas and returns it as a PNG, or null
 * when there's nothing to save. Strokes go on their own layer first so the
 * eraser cuts through ink only, not the background.
 */
export async function renderPagePng(
  strokes: readonly Stroke[],
  colourOf: (id: WhiteboardColourId) => string,
  background: string,
  devicePixelRatio: number,
): Promise<Blob | null> {
  const bounds = drawingBounds(strokes);
  if (!bounds) return null;
  const scale = exportScale(bounds, devicePixelRatio);
  const width = Math.round(bounds.width * scale);
  const height = Math.round(bounds.height * scale);

  const ink = document.createElement('canvas');
  ink.width = width;
  ink.height = height;
  const inkCtx = ink.getContext('2d');
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const outCtx = out.getContext('2d');
  if (!inkCtx || !outCtx) return null;

  inkCtx.setTransform(scale, 0, 0, scale, -bounds.x * scale, -bounds.y * scale);
  for (const stroke of strokes) drawStroke(inkCtx, stroke, colourOf);

  outCtx.fillStyle = background;
  outCtx.fillRect(0, 0, width, height);
  outCtx.drawImage(ink, 0, 0);

  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
}

/** Hands a file to the browser's downloads. */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Give the download a moment to start before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
