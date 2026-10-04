/** A project's files: absolute path (`/src/App.tsx`) to source text. */
export type SandboxFiles = Record<string, string>;

/* Response shapes of the sandboxes endpoints (apps/api sandboxes.presenter). */

export interface SandboxSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxDetail extends SandboxSummary {
  files: SandboxFiles;
}

export interface CreateSandboxInput {
  name: string;
  files: SandboxFiles;
}

export interface UpdateSandboxInput {
  name?: string;
  files?: SandboxFiles;
}

/** Where the workspace's latest edits are. */
export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error' | 'too-large';
