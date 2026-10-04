/** @jest-environment node */
import { SANDBOX_MAX_FILES } from '../constants/sandbox.constant';
import {
  ancestorsOf,
  buildFileTree,
  checkNewFile,
  checkNewFolder,
  checkRename,
  isWithin,
  parentOf,
  visibleNodes,
} from './file-tree';

const FILES = [
  '/package.json',
  '/src/App.tsx',
  '/src/components/Card.tsx',
  '/index.html',
];

describe('paths', () => {
  it('finds the parent folder', () => {
    expect(parentOf('/src/App.tsx')).toBe('/src');
    expect(parentOf('/index.html')).toBe('');
  });

  it('lists the folders above a path', () => {
    expect(ancestorsOf('/src/components/Card.tsx')).toEqual([
      '/src',
      '/src/components',
    ]);
    expect(ancestorsOf('/index.html')).toEqual([]);
  });

  it('knows what is inside a folder', () => {
    expect(isWithin('/src/App.tsx', '/src')).toBe(true);
    expect(isWithin('/srcx/App.tsx', '/src')).toBe(false);
    expect(isWithin('/anything', '')).toBe(true);
  });
});

describe('buildFileTree', () => {
  it('nests files in folders, folders first, each by name', () => {
    const tree = buildFileTree(FILES, ['/public']);

    expect(tree.map((n) => n.name)).toEqual([
      'public',
      'src',
      'index.html',
      'package.json',
    ]);
    const src = tree[1];
    expect(src.kind === 'folder' && src.children.map((n) => n.path)).toEqual([
      '/src/components',
      '/src/App.tsx',
    ]);
  });

  it('shows the contents of open folders only', () => {
    const rows = visibleNodes(buildFileTree(FILES), new Set(['/src']));

    expect(rows.map((r) => [r.node.path, r.depth])).toEqual([
      ['/src', 1],
      ['/src/components', 2],
      ['/src/App.tsx', 2],
      ['/index.html', 1],
      ['/package.json', 1],
    ]);
  });
});

describe('checkNewFile', () => {
  it('makes the file inside the folder', () => {
    expect(checkNewFile('/src', 'Button.tsx', FILES, [])).toEqual({
      path: '/src/Button.tsx',
    });
    expect(checkNewFile('', 'notes.md', FILES, [])).toEqual({
      path: '/notes.md',
    });
  });

  it('makes folders on the way when the name has slashes', () => {
    expect(checkNewFile('/src', 'hooks/use-todos.ts', FILES, [])).toEqual({
      path: '/src/hooks/use-todos.ts',
    });
  });

  it.each([
    ['', 'Enter a name.'],
    [
      'my file.tsx',
      'Use letters, numbers, ".", "_" and "-", with "/" between folders.',
    ],
    [
      '../x.ts',
      'Use letters, numbers, ".", "_" and "-", with "/" between folders.',
    ],
    ['App.tsx', 'App.tsx already exists here.'],
    ['components', 'components already exists here.'],
  ])('refuses %p', (name, error) => {
    expect(checkNewFile('/src', name, FILES, [])).toEqual({ error });
  });

  it('refuses a file inside a file', () => {
    expect(checkNewFile('/src', 'App.tsx/x.ts', FILES, [])).toEqual({
      error: 'A file can’t hold other files.',
    });
  });

  it('refuses once the project has the most files allowed', () => {
    const full = Array.from({ length: SANDBOX_MAX_FILES }, (_, i) => `/f${i}`);
    expect(checkNewFile('', 'one-more.ts', full, [])).toEqual({
      error: `A project can have up to ${SANDBOX_MAX_FILES} files. Delete one first.`,
    });
  });
});

describe('checkNewFolder', () => {
  it('makes the folder inside the folder', () => {
    expect(checkNewFolder('/src', 'hooks', FILES, [])).toEqual({
      path: '/src/hooks',
    });
  });

  it('refuses a name already taken by an empty folder', () => {
    expect(checkNewFolder('/src', 'hooks', FILES, ['/src/hooks'])).toEqual({
      error: 'hooks already exists here.',
    });
  });
});

describe('checkRename', () => {
  it('renames a file in its folder', () => {
    expect(checkRename('/src/App.tsx', 'Main.tsx', FILES, [])).toEqual({
      moves: [['/src/App.tsx', '/src/Main.tsx']],
      to: '/src/Main.tsx',
    });
  });

  it('moves every file inside a renamed folder', () => {
    expect(checkRename('/src', 'app', FILES, [])).toEqual({
      moves: [
        ['/src/App.tsx', '/app/App.tsx'],
        ['/src/components/Card.tsx', '/app/components/Card.tsx'],
      ],
      to: '/app',
    });
  });

  it('does nothing when the name is the same', () => {
    expect(checkRename('/src', 'src', FILES, [])).toEqual({
      moves: [],
      to: '/src',
    });
  });

  it('refuses a name already taken', () => {
    expect(checkRename('/src/App.tsx', 'components', FILES, [])).toEqual({
      error: 'components already exists here.',
    });
  });

  it('refuses moving a folder into itself', () => {
    expect(checkRename('/src', 'src/inner', FILES, [])).toEqual({
      error: 'A folder can’t move into itself.',
    });
  });
});
