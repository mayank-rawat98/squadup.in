/**
 * @jest-environment node
 */
import { projectSize, starterCode, toPackageName } from './project-files';

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
