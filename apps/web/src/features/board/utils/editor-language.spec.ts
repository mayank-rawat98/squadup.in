import { editorLanguageOf } from './editor-language';

describe('editorLanguageOf', () => {
  it.each([
    ['/src/App.tsx', 'tsx'],
    ['/src/utils/sum.ts', 'typescript'],
    ['/vite.config.ts', 'typescript'],
    ['/src/legacy.jsx', 'jsx'],
    ['/src/index.JS', 'javascript'],
    ['/package.json', 'javascript'],
    ['/src/styles.css', 'plain'],
    ['/index.html', 'plain'],
    ['/.gitignore', 'plain'],
    ['/README', 'plain'],
  ])('highlights %s as %s', (path, language) => {
    expect(editorLanguageOf(path)).toBe(language);
  });
});
