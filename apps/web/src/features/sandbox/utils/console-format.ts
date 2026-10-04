/*
 * Console output from the preview, as text. Logged values reach the page
 * through postMessage, so they are plain data by now: strings, numbers,
 * arrays and objects, with no functions or DOM nodes left in them.
 */

export type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleLine {
  id: string;
  method: ConsoleMethod;
  text: string;
}

/** The most lines the console keeps; older ones scroll away. */
export const CONSOLE_MAX_LINES = 200;
const MAX_TEXT_LENGTH = 2000;

const METHODS: readonly ConsoleMethod[] = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
];

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (typeof value !== 'object' || value === null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** One console call's arguments, joined the way the browser console shows them. */
export function formatConsoleArgs(args: readonly unknown[]): string {
  return args.map(formatValue).join(' ').slice(0, MAX_TEXT_LENGTH);
}

export function toConsoleMethod(method: unknown): ConsoleMethod {
  return METHODS.includes(method as ConsoleMethod)
    ? (method as ConsoleMethod)
    : 'log';
}

/** `lines` with `added` on the end, keeping at most CONSOLE_MAX_LINES. */
export function appendConsoleLines(
  lines: readonly ConsoleLine[],
  added: readonly ConsoleLine[],
): ConsoleLine[] {
  return [...lines, ...added].slice(-CONSOLE_MAX_LINES);
}
