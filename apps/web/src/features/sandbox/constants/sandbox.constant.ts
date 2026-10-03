/** Mirrors the API's SANDBOX_NAME_MAX_LENGTH. */
export const SANDBOX_NAME_MAX_LENGTH = 80;
/** Mirrors the API's SANDBOX_MAX_PER_USER. */
export const SANDBOX_MAX_PER_USER = 50;
/** Mirrors the API's SANDBOX_MAX_FILES. */
export const SANDBOX_MAX_FILES = 100;
/** Mirrors the API's SANDBOX_MAX_TOTAL_BYTES: the whole project's source. */
export const SANDBOX_MAX_TOTAL_BYTES = 80_000;
/** Mirrors the API's SANDBOX_PATH_MAX_LENGTH and SANDBOX_PATH_PATTERN. */
export const SANDBOX_PATH_MAX_LENGTH = 200;
export const SANDBOX_PATH_PATTERN = /^(\/(?!\.\.?(?:\/|$))[A-Za-z0-9._-]+)+$/;

/** How long after the last keystroke the workspace saves. */
export const SANDBOX_AUTOSAVE_DELAY_MS = 1200;

/** The file the preview runs first, as `main` in a Vite project's index.html. */
export const SANDBOX_ENTRY = '/src/main.tsx';
/** The file a sandbox opens on. */
export const SANDBOX_START_FILE = '/src/App.tsx';
export const SANDBOX_PACKAGE_JSON = '/package.json';

/**
 * Files the project can't run without, so they can't be deleted.
 * package.json is also read-only in the editor: the preview re-reads it on
 * every change, and half-typed JSON would break it. Packages are added and
 * removed from the Packages panel instead.
 */
export const SANDBOX_REQUIRED_FILES: readonly string[] = [
  SANDBOX_PACKAGE_JSON,
  '/index.html',
  SANDBOX_ENTRY,
];
/** Packages the scaffold needs to render at all. */
export const SANDBOX_REQUIRED_PACKAGES: readonly string[] = [
  'react',
  'react-dom',
];

export const SANDBOX_PATH = '/sandbox';
export const sandboxWorkspacePath = (id: string) => `${SANDBOX_PATH}/${id}`;
export const sandboxPreviewPath = (id: string) =>
  `${SANDBOX_PATH}/${id}/preview`;

export const SANDBOX_QUERY_KEYS = {
  all: ['sandboxes'] as const,
  list: () => [...SANDBOX_QUERY_KEYS.all, 'list'] as const,
  detail: (id: string) => [...SANDBOX_QUERY_KEYS.all, 'detail', id] as const,
};

/** The BroadcastChannel the editor tab and its preview tabs talk over. */
export const sandboxChannelName = (id: string) => `squadup:sandbox:${id}`;
