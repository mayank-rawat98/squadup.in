/*
 * Reading and editing package.json's dependencies for the Packages panel.
 * The text is the project's file; edits keep its other fields as they are.
 */

export type PackageSpecResult =
  | { name: string; version: string }
  | { error: string };

/** npm's rules for a package name, scoped or not. */
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
/** A version or range or dist-tag; nothing that could be a URL or a path. */
const PACKAGE_VERSION = /^[A-Za-z0-9.^~<>=*|\s-]+$/;

/**
 * Reads `zod`, `zod@3`, `@tanstack/react-query@^5.0.0` into a name and a
 * version, `latest` when none is given.
 */
export function parsePackageSpec(input: string): PackageSpecResult {
  const spec = input.trim();
  const at = spec.lastIndexOf('@');
  const hasVersion = at > 0;
  const name = (hasVersion ? spec.slice(0, at) : spec).toLowerCase();
  const version = hasVersion ? spec.slice(at + 1).trim() : 'latest';

  if (!name) return { error: 'Enter a package name, like zod or zod@3.' };
  if (name.length > 214 || !PACKAGE_NAME.test(name)) {
    return { error: `${name} isn't a valid npm package name.` };
  }
  if (!version || version.length > 50 || !PACKAGE_VERSION.test(version)) {
    return { error: 'Use a version like 3, ^3.2.0 or latest.' };
  }
  return { name, version };
}

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  [key: string]: unknown;
}

function parse(text: string): PackageJsonShape | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as PackageJsonShape)
      : null;
  } catch {
    return null;
  }
}

/** The dependencies, sorted by name; empty when the JSON can't be read. */
export function readDependencies(text: string): [string, string][] {
  const deps = parse(text)?.dependencies ?? {};
  return Object.entries(deps)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .sort(([a], [b]) => a.localeCompare(b));
}

function withDependencies(
  text: string,
  change: (deps: Record<string, string>) => Record<string, string>,
): string | null {
  const json = parse(text);
  if (!json) return null;
  const dependencies = change({ ...(json.dependencies ?? {}) });
  const sorted = Object.fromEntries(
    Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${JSON.stringify({ ...json, dependencies: sorted }, null, 2)}\n`;
}

/** package.json with `name` added or set to `version`; null if it can't be read. */
export function addDependency(
  text: string,
  name: string,
  version: string,
): string | null {
  return withDependencies(text, (deps) => ({ ...deps, [name]: version }));
}

export function removeDependency(text: string, name: string): string | null {
  return withDependencies(text, (deps) => {
    const rest = { ...deps };
    delete rest[name];
    return rest;
  });
}
