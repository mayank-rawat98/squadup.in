import { strToU8, zipSync } from 'fflate';
import type { SandboxFiles } from '../types/sandbox.types';
import { toPackageName } from './project-files';

/**
 * The project as a zip with everything inside one folder named after it,
 * the way a downloaded repository unpacks.
 */
export function buildProjectZip(
  name: string,
  files: SandboxFiles,
): Uint8Array<ArrayBuffer> {
  const folder = toPackageName(name);
  const entries = Object.fromEntries(
    Object.entries(files).map(([path, code]) => [
      `${folder}${path}`,
      strToU8(code),
    ]),
  );
  return zipSync(entries, { level: 6 }) as Uint8Array<ArrayBuffer>;
}

/** Saves the project zip through the browser's download. */
export function downloadProject(name: string, files: SandboxFiles): void {
  const blob = new Blob([buildProjectZip(name, files)], {
    type: 'application/zip',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${toPackageName(name)}.zip`;
  link.click();
  // The click starts the download synchronously; the URL can go after.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
