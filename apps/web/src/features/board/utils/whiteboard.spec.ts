/** @jest-environment node */
import {
  type Stroke,
  addPoint,
  isStroke,
  lastStrokeBy,
  setEnd,
} from './whiteboard';

const stroke = (id: string, author: string): Stroke => ({
  id,
  author,
  tool: 'pen',
  colour: 'ink',
  size: 4,
  points: [0, 0],
});

describe('addPoint', () => {
  it('rounds to a tenth of a pixel', () => {
    expect(addPoint([], 10.04, 20.06)).toEqual([10, 20.1]);
  });

  it('skips a point too close to the last one', () => {
    const points = [10, 10];
    expect(addPoint(points, 11, 11)).toBe(points);
    expect(addPoint(points, 13, 10)).toEqual([10, 10, 13, 10]);
  });
});

describe('setEnd', () => {
  it('keeps the start and replaces the end of a shape', () => {
    expect(setEnd([5, 5, 9, 9], 20.26, 30)).toEqual([5, 5, 20.3, 30]);
  });
});

describe('lastStrokeBy', () => {
  const strokes = [
    stroke('a', 'me'),
    stroke('b', 'diya'),
    stroke('c', 'me'),
    stroke('d', 'diya'),
  ];

  it("finds your newest stroke, not someone else's", () => {
    expect(lastStrokeBy(strokes, 'me')).toBe(2);
  });

  it('is -1 when you have drawn nothing', () => {
    expect(lastStrokeBy(strokes, 'kabir')).toBe(-1);
  });
});

describe('isStroke', () => {
  it('accepts a stored stroke', () => {
    expect(isStroke(stroke('a', 'me'))).toBe(true);
  });

  it.each([[null], [{}], [{ id: 'x', tool: 'pen', points: [] }]])(
    'rejects %p',
    (value) => {
      expect(isStroke(value)).toBe(false);
    },
  );
});
