/** @jest-environment node */
import {
  CONSOLE_MAX_LINES,
  type ConsoleLine,
  appendConsoleLines,
  formatConsoleArgs,
  toConsoleMethod,
} from './console-format';

describe('formatConsoleArgs', () => {
  it('joins arguments as the browser console does', () => {
    expect(
      formatConsoleArgs(['count', 3, true, null, undefined, { a: [1] }]),
    ).toBe('count 3 true null undefined {"a":[1]}');
  });

  it('copes with values JSON cannot write', () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(formatConsoleArgs([loop])).toBe('[object Object]');
  });

  it('cuts very long output', () => {
    expect(formatConsoleArgs(['x'.repeat(5000)])).toHaveLength(2000);
  });
});

describe('toConsoleMethod', () => {
  it('keeps the methods the console shows', () => {
    expect(toConsoleMethod('warn')).toBe('warn');
  });

  it('shows anything else as a log', () => {
    expect(toConsoleMethod('table')).toBe('log');
    expect(toConsoleMethod(undefined)).toBe('log');
  });
});

describe('appendConsoleLines', () => {
  const line = (id: number): ConsoleLine => ({
    id: String(id),
    method: 'log',
    text: `line ${id}`,
  });

  it('keeps only the newest lines', () => {
    const lines = Array.from({ length: CONSOLE_MAX_LINES }, (_, i) => line(i));

    const next = appendConsoleLines(lines, [line(CONSOLE_MAX_LINES)]);

    expect(next).toHaveLength(CONSOLE_MAX_LINES);
    expect(next[0].id).toBe('1');
    expect(next.at(-1)?.id).toBe(String(CONSOLE_MAX_LINES));
  });
});
