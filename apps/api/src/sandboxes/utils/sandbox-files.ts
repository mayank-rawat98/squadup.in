import {
  SANDBOX_MAX_FILES,
  SANDBOX_MAX_TOTAL_BYTES,
  SANDBOX_PATH_MAX_LENGTH,
  SANDBOX_PATH_PATTERN,
} from '../constants/sandbox.constants';

/** A project's files: absolute path to source text. */
export type SandboxFiles = Record<string, string>;

/**
 * Why `files` can't be saved as a project, or null when it can. The message
 * is shown to the person, so it says what to change.
 */
export function findSandboxFilesProblem(files: unknown): string | null {
  if (typeof files !== 'object' || files === null || Array.isArray(files)) {
    return 'Send the project files as an object of path to contents.';
  }
  const entries = Object.entries(files);
  if (entries.length === 0) {
    return 'A project needs at least one file.';
  }
  if (entries.length > SANDBOX_MAX_FILES) {
    return `A project can have up to ${SANDBOX_MAX_FILES} files. Delete some and try again.`;
  }

  let totalBytes = 0;
  for (const [path, contents] of entries) {
    if (
      path.length > SANDBOX_PATH_MAX_LENGTH ||
      !SANDBOX_PATH_PATTERN.test(path)
    ) {
      return `"${path.slice(0, SANDBOX_PATH_MAX_LENGTH)}" isn't a valid file path. Use letters, numbers, ".", "_" and "-", with "/" between folders.`;
    }
    if (typeof contents !== 'string') {
      return `The contents of ${path} must be text.`;
    }
    totalBytes += Buffer.byteLength(contents, 'utf8');
  }
  if (totalBytes > SANDBOX_MAX_TOTAL_BYTES) {
    return `This project is larger than ${SANDBOX_MAX_TOTAL_BYTES / 1000} KB of code. Remove some code or files and try again.`;
  }
  return null;
}
