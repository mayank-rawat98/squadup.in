import {
  SANDBOX_MAX_FILES,
  SANDBOX_MAX_TOTAL_BYTES,
} from '../constants/sandbox.constants';
import { findSandboxFilesProblem } from './sandbox-files';

describe('findSandboxFilesProblem', () => {
  it('accepts a normal project', () => {
    expect(
      findSandboxFilesProblem({
        '/package.json': '{}',
        '/src/App.tsx': 'export default function App() {}',
        '/src/components/My-Button_2.tsx': '',
        '/.prettierrc': '{}',
      }),
    ).toBeNull();
  });

  it.each([
    ['an array', []],
    ['null', null],
    ['a string', 'files'],
  ])('rejects %s', (_label, files) => {
    expect(findSandboxFilesProblem(files)).toBe(
      'Send the project files as an object of path to contents.',
    );
  });

  it('rejects an empty project', () => {
    expect(findSandboxFilesProblem({})).toBe(
      'A project needs at least one file.',
    );
  });

  it('rejects more files than the limit', () => {
    const files = Object.fromEntries(
      Array.from({ length: SANDBOX_MAX_FILES + 1 }, (_, i) => [
        `/f${i}.ts`,
        '',
      ]),
    );
    expect(findSandboxFilesProblem(files)).toBe(
      `A project can have up to ${SANDBOX_MAX_FILES} files. Delete some and try again.`,
    );
  });

  it.each([
    'src/App.tsx',
    '/src/../secret',
    '/..',
    '/.',
    '/src//App.tsx',
    '/src/App.tsx/',
    '/src/./App.tsx',
    '/src/my file.tsx',
    `/${'a'.repeat(200)}`,
  ])('rejects the path %s', (path) => {
    expect(findSandboxFilesProblem({ [path]: '' })).toMatch(
      /isn't a valid file path/,
    );
  });

  it('rejects contents that are not text', () => {
    expect(findSandboxFilesProblem({ '/App.tsx': 42 })).toBe(
      'The contents of /App.tsx must be text.',
    );
  });

  it('counts the size in UTF-8 bytes, not characters', () => {
    // "é" is two bytes, so this is one byte over the limit.
    const contents = 'é'.repeat(SANDBOX_MAX_TOTAL_BYTES / 2) + 'a';
    expect(findSandboxFilesProblem({ '/App.tsx': contents })).toMatch(
      /larger than 80 KB/,
    );
    expect(
      findSandboxFilesProblem({
        '/App.tsx': 'é'.repeat(SANDBOX_MAX_TOTAL_BYTES / 2),
      }),
    ).toBeNull();
  });
});
