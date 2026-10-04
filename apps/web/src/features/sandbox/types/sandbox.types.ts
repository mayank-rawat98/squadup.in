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

/**
 * A project open in an editor, and the changes the explorer and Packages
 * panel make to it. The personal workspace backs it with Sandpack's
 * provider (useSandpackProject); a board room with its shared Yjs document
 * (useSharedProject), so the same panels edit both.
 */
export interface ProjectFiles {
  files: SandboxFiles;
  /** The file in the editor; '' when none is open. */
  activeFile: string;
  /** Files open in the editor, the active one included. */
  visibleFiles: readonly string[];
  openFile: (path: string) => void;
  /** Adds the files, or replaces those that exist. */
  addFiles: (files: SandboxFiles) => void;
  deleteFile: (path: string) => void;
  updateFile: (path: string, code: string) => void;
}
