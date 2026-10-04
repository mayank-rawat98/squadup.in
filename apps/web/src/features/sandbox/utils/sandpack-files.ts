import type {
  SandpackFiles,
  SandpackSetup,
  SandpackState,
} from '@codesandbox/sandpack-react';
import {
  SANDBOX_ENTRY,
  SANDBOX_PACKAGE_JSON,
} from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';

/**
 * The editor's provider setup. Without one, Sandpack merges its vanilla
 * template's files into the project; the preview's own setup is
 * toSandboxSetup. Module-level, because the provider resets every edit
 * when this object changes.
 */
export const SANDPACK_SETUP: SandpackSetup = {
  entry: SANDBOX_ENTRY,
  environment: 'create-react-app',
};

/** The project as Sandpack's files; package.json is edited through the Packages panel. */
export function toSandpackFiles(files: SandboxFiles): SandpackFiles {
  return Object.fromEntries(
    Object.entries(files).map(([path, code]) => [
      path,
      path === SANDBOX_PACKAGE_JSON ? { code, readOnly: true } : { code },
    ]),
  );
}

/** Sandpack's files back to the project, as the API stores it. */
export function fromSandpackFiles(files: SandpackState['files']): SandboxFiles {
  return Object.fromEntries(
    Object.entries(files).map(([path, file]) => [path, file.code]),
  );
}
