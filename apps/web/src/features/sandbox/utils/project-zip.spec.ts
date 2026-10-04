/**
 * @jest-environment node
 */
import { strFromU8, unzipSync } from 'fflate';
import { buildProjectZip } from './project-zip';

describe('buildProjectZip', () => {
  it('puts every file in a folder named after the project', () => {
    const zip = buildProjectZip('My Todo App', {
      '/package.json': '{}',
      '/src/App.tsx': 'export default function App() {}',
      '/src/components/Card.tsx': '// नमस्ते',
    });

    const entries = unzipSync(zip);

    expect(Object.keys(entries).sort()).toEqual([
      'my-todo-app/package.json',
      'my-todo-app/src/App.tsx',
      'my-todo-app/src/components/Card.tsx',
    ]);
    expect(strFromU8(entries['my-todo-app/src/components/Card.tsx'])).toBe(
      '// नमस्ते',
    );
  });
});
