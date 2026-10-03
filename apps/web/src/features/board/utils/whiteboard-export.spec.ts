import type { Stroke } from './whiteboard';
import {
  EXPORT_MARGIN,
  EXPORT_MAX_SIDE,
  drawingBounds,
  exportFileName,
  exportScale,
} from './whiteboard-export';

const stroke = (patch: Partial<Stroke>): Stroke => ({
  id: 's',
  author: 'u1',
  tool: 'pen',
  colour: 'ink',
  size: 4,
  points: [0, 0],
  ...patch,
});

describe('drawingBounds', () => {
  it('is null for an empty page', () => {
    expect(drawingBounds([])).toBeNull();
  });

  it('wraps the drawing with its line width and the margin', () => {
    const bounds = drawingBounds([
      stroke({ size: 4, points: [100, 50, 300, 250] }),
    ]);

    expect(bounds).toEqual({
      x: 100 - 2 - EXPORT_MARGIN,
      y: 50 - 2 - EXPORT_MARGIN,
      width: 200 + 4 + EXPORT_MARGIN * 2,
      height: 200 + 4 + EXPORT_MARGIN * 2,
    });
  });

  it('counts a highlighter at its drawn width', () => {
    const bounds = drawingBounds([
      stroke({ tool: 'marker', size: 4, points: [100, 100] }),
    ]);

    expect(bounds).toEqual({
      x: 100 - 8 - EXPORT_MARGIN,
      y: 100 - 8 - EXPORT_MARGIN,
      width: 16 + EXPORT_MARGIN * 2,
      height: 16 + EXPORT_MARGIN * 2,
    });
  });

  it('ignores eraser strokes, so a page that was only erased has nothing to save', () => {
    expect(
      drawingBounds([stroke({ tool: 'eraser', points: [0, 0, 900, 900] })]),
    ).toBeNull();
  });
});

describe('exportScale', () => {
  const small = { x: 0, y: 0, width: 400, height: 300 };

  it('matches the screen density up to 2x', () => {
    expect(exportScale(small, 1)).toBe(1);
    expect(exportScale(small, 2)).toBe(2);
    expect(exportScale(small, 3)).toBe(2);
  });

  it('shrinks a huge drawing so no side passes the cap', () => {
    const huge = { x: 0, y: 0, width: EXPORT_MAX_SIDE * 2, height: 100 };

    expect(exportScale(huge, 2)).toBe(0.5);
  });
});

describe('exportFileName', () => {
  it('names the file after the room and page', () => {
    expect(exportFileName('Two-sum warmup', 2)).toBe(
      'two-sum-warmup-page-2.png',
    );
  });

  it('falls back to "whiteboard" when the name has no usable characters', () => {
    expect(exportFileName('✨✨', 1)).toBe('whiteboard-page-1.png');
  });
});
