import {
  SANDBOX_MAX_FILES,
  SANDBOX_PATH_MAX_LENGTH,
  SANDBOX_PATH_PATTERN,
} from '../constants/sandbox.constant';

/*
 * The file explorer's model. The project is a flat map of path to source,
 * so folders are implied by the paths in it; a folder someone has just made
 * and not put a file in yet is passed in separately, as `emptyFolders`.
 * The root folder's path is "" and a folder's path has no trailing slash.
 */

export interface FileNode {
  kind: 'file';
  path: string;
  name: string;
}

export interface FolderNode {
  kind: 'folder';
  path: string;
  name: string;
  children: TreeNode[];
}

export type TreeNode = FileNode | FolderNode;

export const ROOT_FOLDER = '';

/** The folder a path is in: `/src/App.tsx` → `/src`, `/index.html` → "". */
export function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}

export function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Every folder above `path`, outermost first: `/a/b/c.ts` → `/a`, `/a/b`. */
export function ancestorsOf(path: string): string[] {
  const parts = path.split('/').slice(1, -1);
  return parts.map((_, i) => `/${parts.slice(0, i + 1).join('/')}`);
}

/** Whether `path` is `folder` itself or somewhere inside it. */
export function isWithin(path: string, folder: string): boolean {
  return (
    folder === ROOT_FOLDER || path === folder || path.startsWith(`${folder}/`)
  );
}

/** Folders first, then files, each by name, as VS Code lists them. */
function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export function buildFileTree(
  filePaths: readonly string[],
  emptyFolders: readonly string[] = [],
): TreeNode[] {
  const root: FolderNode = {
    kind: 'folder',
    path: ROOT_FOLDER,
    name: '',
    children: [],
  };
  const folders = new Map<string, FolderNode>([[ROOT_FOLDER, root]]);

  const folderAt = (path: string): FolderNode => {
    const existing = folders.get(path);
    if (existing) return existing;
    const folder: FolderNode = {
      kind: 'folder',
      path,
      name: nameOf(path),
      children: [],
    };
    folders.set(path, folder);
    folderAt(parentOf(path)).children.push(folder);
    return folder;
  };

  for (const folder of emptyFolders) folderAt(folder);
  for (const path of filePaths) {
    folderAt(parentOf(path)).children.push({
      kind: 'file',
      path,
      name: nameOf(path),
    });
  }

  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort(compareNodes)
      .map((node) =>
        node.kind === 'folder'
          ? { ...node, children: sort(node.children) }
          : node,
      );
  return sort(root.children);
}

/** The rows the tree shows: open folders' contents, depth-first. */
export function visibleNodes(
  nodes: readonly TreeNode[],
  expanded: ReadonlySet<string>,
  depth = 1,
): { node: TreeNode; depth: number }[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(node.kind === 'folder' && expanded.has(node.path)
      ? visibleNodes(node.children, expanded, depth + 1)
      : []),
  ]);
}

export type PathResult = { path: string } | { error: string };

const NAME_RULE =
  'Use letters, numbers, ".", "_" and "-", with "/" between folders.';

/**
 * A name typed into the tree, made into a path inside `folder`. The name
 * may hold slashes (`components/Card.tsx`) to make folders on the way.
 */
export function pathInFolder(folder: string, name: string): PathResult {
  const trimmed = name.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return { error: 'Enter a name.' };
  const path = `${folder}/${trimmed}`;
  if (
    path.length > SANDBOX_PATH_MAX_LENGTH ||
    !SANDBOX_PATH_PATTERN.test(path)
  ) {
    return { error: NAME_RULE };
  }
  return { path };
}

/** Whether `path` is taken, by a file or by a folder of that name. */
export function isTaken(
  path: string,
  filePaths: readonly string[],
  emptyFolders: readonly string[],
): boolean {
  return (
    filePaths.some((p) => p === path || p.startsWith(`${path}/`)) ||
    emptyFolders.some((f) => f === path || f.startsWith(`${path}/`))
  );
}

export function checkNewFile(
  folder: string,
  name: string,
  filePaths: readonly string[],
  emptyFolders: readonly string[],
): PathResult {
  const result = pathInFolder(folder, name);
  if ('error' in result) return result;
  if (isTaken(result.path, filePaths, emptyFolders)) {
    return { error: `${nameOf(result.path)} already exists here.` };
  }
  if (filePaths.some((p) => result.path.startsWith(`${p}/`))) {
    return { error: 'A file can’t hold other files.' };
  }
  if (filePaths.length >= SANDBOX_MAX_FILES) {
    return {
      error: `A project can have up to ${SANDBOX_MAX_FILES} files. Delete one first.`,
    };
  }
  return result;
}

export function checkNewFolder(
  folder: string,
  name: string,
  filePaths: readonly string[],
  emptyFolders: readonly string[],
): PathResult {
  const result = pathInFolder(folder, name);
  if ('error' in result) return result;
  if (isTaken(result.path, filePaths, emptyFolders)) {
    return { error: `${nameOf(result.path)} already exists here.` };
  }
  if (filePaths.some((p) => result.path.startsWith(`${p}/`))) {
    return { error: 'A file can’t hold a folder.' };
  }
  return result;
}

export type RenameResult =
  | { moves: [from: string, to: string][]; to: string }
  | { error: string };

/**
 * Renaming the file or folder at `from` to `name`, in the same folder. For
 * a folder, every file inside moves with it.
 */
export function checkRename(
  from: string,
  name: string,
  filePaths: readonly string[],
  emptyFolders: readonly string[],
): RenameResult {
  const result = pathInFolder(parentOf(from), name);
  if ('error' in result) return result;
  const to = result.path;
  if (to === from) return { moves: [], to };
  if (isWithin(to, from)) return { error: 'A folder can’t move into itself.' };
  if (isTaken(to, filePaths, emptyFolders)) {
    return { error: `${nameOf(to)} already exists here.` };
  }
  const moves = filePaths
    .filter((p) => isWithin(p, from))
    .map((p): [string, string] => [p, `${to}${p.slice(from.length)}`]);
  const tooLong = moves.find(
    ([, path]) =>
      path.length > SANDBOX_PATH_MAX_LENGTH || !SANDBOX_PATH_PATTERN.test(path),
  );
  if (tooLong) return { error: `${tooLong[1].slice(1)} would be too long.` };
  return { moves, to };
}
