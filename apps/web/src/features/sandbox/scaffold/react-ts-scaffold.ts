import type { SandboxFiles } from '../types/sandbox.types';
import { toPackageName } from '../utils/project-files';

/*
 * The project every new sandbox starts from: the shape `npm create vite`
 * gives a React + TypeScript app, so a downloaded sandbox runs with
 * `npm install && npm run dev`. The in-browser preview runs the same files
 * (SANDBOX_ENTRY), so nothing differs between the two.
 */

const APP = `import { useState } from 'react';
import { Rocket } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app">
      <Rocket size={40} aria-hidden="true" />
      <h1>Hello from SquadUp</h1>
      <p>Edit src/App.tsx and the preview updates as you type.</p>
      <button type="button" onClick={() => setCount((n) => n + 1)}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </main>
  );
}
`;

const MAIN = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const STYLES = `:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1f2330;
  background: #f7f7fb;
}

body {
  margin: 0;
}

.app {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

button {
  padding: 10px 18px;
  border: 0;
  border-radius: 8px;
  background: #6d3ff2;
  color: white;
  font: inherit;
  cursor: pointer;
}
`;

const indexHtml = (title: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const packageJson = (name: string) =>
  `${JSON.stringify(
    {
      name: toPackageName(name),
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc --noEmit && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        'lucide-react': '^1.51.0',
        react: '^19.2.0',
        'react-dom': '^19.2.0',
      },
      devDependencies: {
        '@types/react': '^19.2.0',
        '@types/react-dom': '^19.2.0',
        '@vitejs/plugin-react': '^6.1.0',
        typescript: '~6.0.3',
        vite: '^8.3.0',
      },
    },
    null,
    2,
  )}\n`;

const TSCONFIG = `${JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      isolatedModules: true,
      types: ['vite/client'],
    },
    include: ['src'],
  },
  null,
  2,
)}\n`;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

const GITIGNORE = `node_modules
dist
`;

const readme = (name: string) => `# ${name}

Made in the SquadUp React sandbox.

\`\`\`sh
npm install
npm run dev
\`\`\`
`;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** A fresh React + TypeScript project named `name`. */
export function createReactTsScaffold(name: string): SandboxFiles {
  return {
    '/src/App.tsx': APP,
    '/src/main.tsx': MAIN,
    '/src/styles.css': STYLES,
    '/index.html': indexHtml(name),
    '/package.json': packageJson(name),
    '/tsconfig.json': TSCONFIG,
    '/vite.config.ts': VITE_CONFIG,
    '/.gitignore': GITIGNORE,
    '/README.md': readme(name),
  };
}
