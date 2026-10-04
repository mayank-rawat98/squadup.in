/**
 * @jest-environment node
 */
import {
  SANDBOX_ENTRY,
  SANDBOX_MAX_TOTAL_BYTES,
  SANDBOX_PATH_PATTERN,
  SANDBOX_REQUIRED_FILES,
  SANDBOX_START_FILE,
} from '../constants/sandbox.constant';
import { projectSize } from '../utils/project-files';
import { createReactTsScaffold } from './react-ts-scaffold';

describe('createReactTsScaffold', () => {
  const files = createReactTsScaffold('Todo <App>');

  it('has the files a Vite React + TypeScript app needs', () => {
    for (const path of [
      ...SANDBOX_REQUIRED_FILES,
      SANDBOX_START_FILE,
      '/tsconfig.json',
      '/vite.config.ts',
    ]) {
      expect(files[path]).toBeDefined();
    }
  });

  it('loads the preview entry from index.html, as Vite does', () => {
    expect(files['/index.html']).toContain(
      `<script type="module" src="${SANDBOX_ENTRY}"></script>`,
    );
  });

  it('names the package and page after the sandbox, safely', () => {
    expect(JSON.parse(files['/package.json']).name).toBe('todo-app');
    expect(files['/index.html']).toContain('<title>Todo &lt;App&gt;</title>');
  });

  it('can run in the preview and on a laptop', () => {
    const pkg = JSON.parse(files['/package.json']);
    expect(Object.keys(pkg.dependencies)).toEqual(
      expect.arrayContaining(['react', 'react-dom']),
    );
    expect(pkg.scripts.dev).toBe('vite');
  });

  it('fits the API limits', () => {
    expect(Object.keys(files).every((p) => SANDBOX_PATH_PATTERN.test(p))).toBe(
      true,
    );
    expect(projectSize(files)).toBeLessThan(SANDBOX_MAX_TOTAL_BYTES);
  });
});
