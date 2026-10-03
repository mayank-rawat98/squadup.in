import {
  SANDBOX_MAX_FILES,
  SANDBOX_PATH_MAX_LENGTH,
  SANDBOX_PATH_PATTERN,
} from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';

export type NewPathResult = { path: string } | { error: string };

/**
 * Turns what someone typed into "New file" (`src/components/Card.tsx`) into
 * a project path, or says why it can't be one. Same rules as the API.
 */
export function toNewFilePath(
  input: string,
  existing: SandboxFiles,
): NewPathResult {
  const trimmed = input.trim().replace(/^\.?\/+/, '');
  if (!trimmed) return { error: 'Enter a file name, like src/Card.tsx.' };
  const path = `/${trimmed}`;
  if (
    path.length > SANDBOX_PATH_MAX_LENGTH ||
    !SANDBOX_PATH_PATTERN.test(path)
  ) {
    return {
      error:
        'Use letters, numbers, ".", "_" and "-", with "/" between folders.',
    };
  }
  if (path in existing) return { error: `${trimmed} already exists.` };
  if (Object.keys(existing).some((p) => p.startsWith(`${path}/`))) {
    return { error: `${trimmed} is a folder. Add a file inside it instead.` };
  }
  if (Object.keys(existing).length >= SANDBOX_MAX_FILES) {
    return {
      error: `A project can have up to ${SANDBOX_MAX_FILES} files. Delete one first.`,
    };
  }
  return { path };
}

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

/** Paths in the order the file list shows them: folders first, then by name. */
export function sortPaths(paths: readonly string[]): string[] {
  return [...paths].sort((a, b) => {
    const aParts = a.split('/');
    const bParts = b.split('/');
    for (let i = 1; i < Math.min(aParts.length, bParts.length); i++) {
      const aIsDir = i < aParts.length - 1;
      const bIsDir = i < bParts.length - 1;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      if (aParts[i] !== bParts[i]) return aParts[i].localeCompare(bParts[i]);
    }
    return aParts.length - bParts.length;
  });
}
