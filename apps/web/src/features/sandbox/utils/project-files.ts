import type { SandboxFiles } from '../types/sandbox.types';

/** What a new file starts with: a component for .tsx/.jsx, else nothing. */
export function starterCode(path: string): string {
  const match = /\/([^/]+)\.(tsx|jsx)$/.exec(path);
  if (!match) return '';
  const name = toComponentName(match[1]);
  return `export default function ${name}() {\n  return <div>${name}</div>;\n}\n`;
}

function toComponentName(base: string): string {
  const name = base
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
  return /^[A-Za-z]/.test(name) ? name : `Component${name}`;
}

/** The project's source size in UTF-8 bytes, as the API counts it. */
export function projectSize(files: SandboxFiles): number {
  const encoder = new TextEncoder();
  return Object.values(files).reduce(
    (total, code) => total + encoder.encode(code).length,
    0,
  );
}

/** A name safe for package.json and the zip's folder: `todo-app`. */
export function toPackageName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'react-sandbox';
}
