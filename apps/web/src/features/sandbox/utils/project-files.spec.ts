/**
 * @jest-environment node
 */
import { SANDBOX_MAX_FILES } from '../constants/sandbox.constant';
import {
  projectSize,
  sortPaths,
  starterCode,
  toNewFilePath,
  toPackageName,
} from './project-files';

const FILES = { '/src/App.tsx': '', '/src/components/Card.tsx': '' };

describe('toNewFilePath', () => {
  it.each([
    ['src/Button.tsx', '/src/Button.tsx'],
    ['/src/Button.tsx', '/src/Button.tsx'],
    ['./hooks/use-todos.ts', '/hooks/use-todos.ts'],
    ['  .env.example ', '/.env.example'],
  ])('turns %p into %p', (input, path) => {
    expect(toNewFilePath(input, FILES)).toEqual({ path });
  });

  it('asks for a name when nothing was typed', () => {
    expect(toNewFilePath('  ', FILES)).toEqual({
      error: 'Enter a file name, like src/Card.tsx.',
    });
  });

  it.each(['src/../App.tsx', 'src//App.tsx', 'my file.tsx', 'src/App.tsx/'])(
    'refuses %p',
    (input) => {
      expect(toNewFilePath(input, FILES)).toEqual({
        error:
          'Use letters, numbers, ".", "_" and "-", with "/" between folders.',
      });
    },
  );

  it('refuses a file that already exists', () => {
    expect(toNewFilePath('src/App.tsx', FILES)).toEqual({
      error: 'src/App.tsx already exists.',
    });
  });

  it('refuses a path that is a folder', () => {
    expect(toNewFilePath('src/components', FILES)).toEqual({
      error: 'src/components is a folder. Add a file inside it instead.',
    });
  });

  it('refuses once the project has the most files allowed', () => {
    const full = Object.fromEntries(
      Array.from({ length: SANDBOX_MAX_FILES }, (_, i) => [`/f${i}.ts`, '']),
    );
    expect(toNewFilePath('one-more.ts', full)).toEqual({
      error: `A project can have up to ${SANDBOX_MAX_FILES} files. Delete one first.`,
    });
  });
});

describe('starterCode', () => {
  it('starts a component file with a component named after it', () => {
    expect(starterCode('/src/components/todo-item.tsx')).toBe(
      'export default function TodoItem() {\n  return <div>TodoItem</div>;\n}\n',
    );
  });

  it('keeps the component name a valid identifier', () => {
    expect(starterCode('/src/404.jsx')).toContain('function Component404()');
  });

  it('leaves other files empty', () => {
    expect(starterCode('/src/utils.ts')).toBe('');
    expect(starterCode('/src/styles.css')).toBe('');
  });
});

describe('projectSize', () => {
  it('counts UTF-8 bytes', () => {
    expect(projectSize({ '/a.ts': 'ab', '/b.ts': 'é' })).toBe(4);
  });
});

describe('toPackageName', () => {
  it('lowercases and hyphenates', () => {
    expect(toPackageName('  My Todo App!! ')).toBe('my-todo-app');
  });

  it('falls back when nothing usable is left', () => {
    expect(toPackageName('🚀')).toBe('react-sandbox');
  });
});

describe('sortPaths', () => {
  it('lists folders before files, each by name', () => {
    expect(
      sortPaths([
        '/package.json',
        '/src/main.tsx',
        '/index.html',
        '/src/components/Card.tsx',
        '/src/App.tsx',
      ]),
    ).toEqual([
      '/src/components/Card.tsx',
      '/src/App.tsx',
      '/src/main.tsx',
      '/index.html',
      '/package.json',
    ]);
  });
});
