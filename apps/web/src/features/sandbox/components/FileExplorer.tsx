'use client';

import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import {
  ChevronRight,
  ChevronsDownUp,
  Ellipsis,
  File,
  FileBraces,
  FileCode,
  FileImage,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Lock,
  type LucideIcon,
  Palette,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@squadup.in/ui';
import {
  SANDBOX_REQUIRED_FILES,
  SANDBOX_START_FILE,
} from '../constants/sandbox.constant';
import type { SandboxFiles } from '../types/sandbox.types';
import {
  ROOT_FOLDER,
  type TreeNode,
  ancestorsOf,
  buildFileTree,
  checkNewFile,
  checkNewFolder,
  checkRename,
  isWithin,
  parentOf,
  visibleNodes,
} from '../utils/file-tree';
import { starterCode } from '../utils/project-files';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import SidebarSection from './SidebarSection';

export interface FileExplorerProps {
  files: SandboxFiles;
  open: boolean;
  onToggle: () => void;
  className?: string;
}

type Editing =
  | { mode: 'new-file' | 'new-folder'; parent: string }
  | { mode: 'rename'; node: TreeNode };

interface MenuState {
  x: number;
  y: number;
  /** null for the project's top level (right-click on empty space). */
  node: TreeNode | null;
}

const INDENT_REM = 0.75;

/** Project paths are only letters, digits, `.`, `_`, `-` and `/`, so they need no escaping here. */
const rowSelector = (path: string) => `[data-path="${path}"]`;
const LOCKED_HINT = 'The project needs this file';

const FILE_ICONS: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileBraces,
  css: Palette,
  md: FileText,
  txt: FileText,
  svg: FileImage,
};

function iconFor(node: TreeNode, open: boolean): LucideIcon {
  if (node.kind === 'folder') return open ? FolderOpen : Folder;
  return FILE_ICONS[node.name.split('.').pop() ?? ''] ?? File;
}

const where = (folder: string) =>
  folder === ROOT_FOLDER ? 'the project' : folder.slice(1);

/*
 * The project's files as a tree, like VS Code's explorer. Click a folder to
 * open it and make it where New file and New folder put things; right-click
 * anything for New file, New folder, Rename and Delete. New names are typed
 * in place, in the folder they're going into.
 *
 * Keyboard: arrow keys move and open or close folders, Enter opens, F2
 * renames, Delete deletes, and Shift+F10 or the menu key opens the actions.
 *
 * The project only stores files, so a folder with nothing in it yet lives
 * here until a file goes in it.
 */
export default function FileExplorer({
  files,
  open,
  onToggle,
  className,
}: FileExplorerProps) {
  const { sandpack } = useSandpack();
  const { activeFile } = sandpack;
  const filePaths = useMemo(() => Object.keys(files), [files]);
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(['/src', ...ancestorsOf(activeFile)]),
  );
  const [selected, setSelected] = useState<string | null>(activeFile);
  const [focused, setFocused] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const tree = useRef<HTMLUListElement>(null);
  const helpId = useId();
  const errorId = useId();

  const nodes = useMemo(
    () => buildFileTree(filePaths, emptyFolders),
    [filePaths, emptyFolders],
  );
  const rows = useMemo(() => visibleNodes(nodes, expanded), [nodes, expanded]);
  const rowAt = (path: string) => rows.find((row) => row.node.path === path);

  // Opening a file (from a tab, or by adding it) shows it in the tree.
  useEffect(() => {
    if (!activeFile) return;
    setSelected(activeFile);
    setExpanded((current) => {
      const missing = ancestorsOf(activeFile).filter((f) => !current.has(f));
      return missing.length ? new Set([...current, ...missing]) : current;
    });
  }, [activeFile]);

  const focusRow = useCallback((path: string) => {
    setFocused(path);
    requestAnimationFrame(() => {
      tree.current?.querySelector<HTMLElement>(rowSelector(path))?.focus();
    });
  }, []);

  const expand = (...folders: string[]) =>
    setExpanded(
      (current) =>
        new Set([...current, ...folders.filter((f) => f !== ROOT_FOLDER)]),
    );
  const toggleFolder = (path: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const isLocked = (node: TreeNode) =>
    node.kind === 'file'
      ? SANDBOX_REQUIRED_FILES.includes(node.path)
      : SANDBOX_REQUIRED_FILES.some((p) => isWithin(p, node.path));

  /** Where New file and New folder go: the selected folder, or the selected file's. */
  const targetFolder = () => {
    if (selected === null) return ROOT_FOLDER;
    const row = rowAt(selected);
    if (row?.node.kind === 'folder') return row.node.path;
    return parentOf(selected);
  };

  const startCreate = (mode: 'new-file' | 'new-folder', parent: string) => {
    if (!open) onToggle();
    expand(...ancestorsOf(`${parent}/x`), parent);
    setEditing({ mode, parent });
    setDraft('');
    setError(null);
  };

  const startRename = (node: TreeNode) => {
    if (isLocked(node)) return;
    setEditing({ mode: 'rename', node });
    setDraft(node.name);
    setError(null);
  };

  const stopEditing = () => {
    const back =
      editing?.mode === 'rename' ? editing.node.path : (selected ?? null);
    setEditing(null);
    setError(null);
    if (back) focusRow(back);
  };

  /** Applies what was typed; false (with the error shown) when it can't. */
  const commit = (): boolean => {
    if (!editing) return true;
    if (editing.mode === 'new-file') {
      const result = checkNewFile(
        editing.parent,
        draft,
        filePaths,
        emptyFolders,
      );
      if ('error' in result) return fail(result.error);
      sandpack.addFile(result.path, starterCode(result.path));
      sandpack.openFile(result.path);
      setEmptyFolders((folders) =>
        folders.filter((f) => !isWithin(result.path, f)),
      );
      expand(...ancestorsOf(result.path));
      done(result.path);
      return true;
    }
    if (editing.mode === 'new-folder') {
      const result = checkNewFolder(
        editing.parent,
        draft,
        filePaths,
        emptyFolders,
      );
      if ('error' in result) return fail(result.error);
      setEmptyFolders((folders) => [...folders, result.path]);
      expand(...ancestorsOf(result.path), result.path);
      done(result.path);
      return true;
    }
    if (editing.mode !== 'rename') return true;
    const from = editing.node.path;
    const result = checkRename(from, draft, filePaths, emptyFolders);
    if ('error' in result) return fail(result.error);
    if (result.to !== from) moveAll(from, result.to, result.moves);
    done(result.to);
    return true;
  };

  const fail = (message: string) => {
    setError(message);
    return false;
  };

  const done = (path: string) => {
    setEditing(null);
    setError(null);
    setSelected(path);
    focusRow(path);
  };

  const moveAll = (
    from: string,
    to: string,
    moves: readonly [string, string][],
  ) => {
    if (moves.length > 0) {
      sandpack.addFile(
        Object.fromEntries(moves.map(([old, next]) => [next, files[old]])),
      );
      const movedActive = moves.find(([old]) => old === activeFile);
      if (movedActive) sandpack.openFile(movedActive[1]);
      for (const [old] of moves) sandpack.deleteFile(old);
    }
    const rename = (path: string) =>
      isWithin(path, from) ? `${to}${path.slice(from.length)}` : path;
    setEmptyFolders((folders) => folders.map(rename));
    setExpanded((current) => new Set([...current].map(rename)));
  };

  const remove = (node: TreeNode) => {
    if (isLocked(node)) return;
    const doomed =
      node.kind === 'file'
        ? [node.path]
        : filePaths.filter((p) => isWithin(p, node.path));
    const what =
      node.kind === 'file'
        ? node.path.slice(1)
        : `the ${node.path.slice(1)} folder${doomed.length ? ` and the ${doomed.length} ${doomed.length === 1 ? 'file' : 'files'} in it` : ''}`;
    if (!window.confirm(`Delete ${what}? This can't be undone.`)) return;

    // Sandpack picks the next tab badly when the last open one goes, so
    // open a file that stays first.
    const staying = filePaths.filter((p) => !doomed.includes(p));
    if (sandpack.visibleFiles.every((p) => doomed.includes(p))) {
      const next = staying.includes(SANDBOX_START_FILE)
        ? SANDBOX_START_FILE
        : staying[0];
      if (next) sandpack.openFile(next);
    }
    for (const path of doomed) sandpack.deleteFile(path);

    const parent = parentOf(node.path);
    setEmptyFolders((folders) => {
      const kept = folders.filter((f) => !isWithin(f, node.path));
      // Like VS Code, a folder stays when its last file is deleted.
      const parentEmpties =
        parent !== ROOT_FOLDER &&
        !staying.some((p) => isWithin(p, parent)) &&
        !kept.includes(parent);
      return parentEmpties ? [...kept, parent] : kept;
    });
    setSelected(parent === ROOT_FOLDER ? null : parent);
    if (parent !== ROOT_FOLDER) focusRow(parent);
  };

  const activate = (node: TreeNode) => {
    setSelected(node.path);
    setFocused(node.path);
    if (node.kind === 'folder') toggleFolder(node.path);
    else sandpack.openFile(node.path);
  };

  const menuItems = (node: TreeNode | null): ContextMenuItem[] => {
    const parent = !node
      ? ROOT_FOLDER
      : node.kind === 'folder'
        ? node.path
        : parentOf(node.path);
    const items: ContextMenuItem[] = [
      {
        label: 'New file…',
        icon: FilePlus,
        onSelect: () => startCreate('new-file', parent),
      },
      {
        label: 'New folder…',
        icon: FolderPlus,
        onSelect: () => startCreate('new-folder', parent),
      },
    ];
    if (!node) return items;
    const locked = isLocked(node);
    const hint =
      node.kind === 'file' ? LOCKED_HINT : 'It holds a file the project needs';
    return [
      ...items,
      {
        label: 'Rename…',
        icon: Pencil,
        onSelect: () => startRename(node),
        disabled: locked,
        hint,
      },
      {
        label: 'Delete',
        icon: Trash2,
        onSelect: () => remove(node),
        disabled: locked,
        hint,
        danger: true,
      },
    ];
  };

  const openMenuAt = (node: TreeNode | null, x: number, y: number) => {
    if (node) setSelected(node.path);
    setMenu({ x, y, node });
  };

  const onRowContextMenu = (event: MouseEvent, node: TreeNode) => {
    event.preventDefault();
    event.stopPropagation();
    setFocused(node.path);
    openMenuAt(node, event.clientX, event.clientY);
  };

  const onTreeKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (editing || rows.length === 0) return;
    const index = Math.max(
      0,
      rows.findIndex((row) => row.node.path === focused),
    );
    const { node } = rows[index];
    const isOpen = node.kind === 'folder' && expanded.has(node.path);

    const actions: Record<string, () => void> = {
      ArrowDown: () =>
        focusRow(rows[Math.min(index + 1, rows.length - 1)].node.path),
      ArrowUp: () => focusRow(rows[Math.max(index - 1, 0)].node.path),
      Home: () => focusRow(rows[0].node.path),
      End: () => focusRow(rows[rows.length - 1].node.path),
      ArrowRight: () => {
        if (node.kind !== 'folder') return;
        if (!isOpen) toggleFolder(node.path);
        else if (node.children[0]) focusRow(node.children[0].path);
      },
      ArrowLeft: () => {
        if (isOpen) toggleFolder(node.path);
        else if (parentOf(node.path) !== ROOT_FOLDER)
          focusRow(parentOf(node.path));
      },
      Enter: () => activate(node),
      ' ': () => activate(node),
      F2: () => startRename(node),
      Delete: () => remove(node),
      ContextMenu: () => openMenuAtRow(node),
    };
    const key =
      event.key === 'F10' && event.shiftKey
        ? 'ContextMenu'
        : event.key === 'Backspace' && event.metaKey
          ? 'Delete'
          : event.key;
    const action = actions[key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const openMenuAtRow = (node: TreeNode) => {
    const row = tree.current?.querySelector<HTMLElement>(
      rowSelector(node.path),
    );
    const box = row?.getBoundingClientRect();
    openMenuAt(node, box ? box.left + 24 : 0, box ? box.bottom : 0);
  };

  const menuNode = menu?.node;
  const closeMenu = useCallback(
    (reason: 'select' | 'dismiss') => {
      setMenu(null);
      if (reason === 'dismiss' && menuNode) focusRow(menuNode.path);
    },
    [focusRow, menuNode],
  );

  const draftInput = (label: string) => (
    <div className="relative min-w-0 flex-1">
      <input
        aria-label={label}
        value={draft}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={(event) => {
          // Select the name without its extension, as VS Code does.
          const dot = event.currentTarget.value.lastIndexOf('.');
          event.currentTarget.setSelectionRange(
            0,
            dot > 0 ? dot : event.currentTarget.value.length,
          );
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            stopEditing();
          }
        }}
        onBlur={() => {
          // Clicking away keeps a good name and drops a bad or empty one.
          if (!draft.trim() || !commit()) stopEditing();
        }}
        className={cn(
          'bg-card text-body-sm h-6 w-full rounded-sm border px-1.5 font-mono focus-visible:outline-none',
          error ? 'border-danger' : 'border-ring',
        )}
      />
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="bg-danger text-danger-foreground text-caption absolute top-full right-0 left-0 z-10 rounded-b-sm px-1.5 py-1"
        >
          {error}
        </p>
      ) : null}
    </div>
  );

  const newRow = (depth: number) => {
    if (!editing || editing.mode === 'rename') return null;
    const Icon = editing.mode === 'new-file' ? File : Folder;
    const kind = editing.mode === 'new-file' ? 'file' : 'folder';
    return (
      <li
        role="none"
        className="flex h-7 items-center gap-1.5 pr-2"
        style={{ paddingLeft: `${depth * INDENT_REM + 1.25}rem` }}
      >
        <Icon
          aria-hidden="true"
          className="text-muted-foreground h-4 w-4 shrink-0"
        />
        {draftInput(`Name of the new ${kind} in ${where(editing.parent)}`)}
      </li>
    );
  };

  const tabStop = focused && rowAt(focused) ? focused : rows[0]?.node.path;

  return (
    <SidebarSection
      title="Files"
      open={open}
      onToggle={onToggle}
      className={className}
      actions={
        <>
          <ToolbarButton
            icon={FilePlus}
            label="New file"
            onClick={() => startCreate('new-file', targetFolder())}
          />
          <ToolbarButton
            icon={FolderPlus}
            label="New folder"
            onClick={() => startCreate('new-folder', targetFolder())}
          />
          <ToolbarButton
            icon={ChevronsDownUp}
            label="Collapse all folders"
            onClick={() => setExpanded(new Set())}
          />
        </>
      }
    >
      <div
        className="flex min-h-full flex-col pb-6"
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setSelected(null);
          openMenuAt(null, event.clientX, event.clientY);
        }}
      >
        <p id={helpId} className="sr-only">
          Arrow keys move and open folders. Enter opens a file. F2 renames,
          Delete (Command Backspace on a Mac) deletes, and Shift F10 shows more
          actions.
        </p>
        {editing &&
        editing.mode !== 'rename' &&
        editing.parent === ROOT_FOLDER ? (
          <ul role="none">{newRow(0)}</ul>
        ) : null}
        <ul
          ref={tree}
          role="tree"
          aria-label="Project files"
          aria-describedby={helpId}
          onKeyDown={onTreeKeyDown}
        >
          {rows.map(({ node, depth }) => {
            const isFolder = node.kind === 'folder';
            const isOpen = isFolder && expanded.has(node.path);
            const Icon = iconFor(node, isOpen);
            const locked = isLocked(node);
            const renaming =
              editing?.mode === 'rename' && editing.node.path === node.path;
            const isSelected = selected === node.path;
            const isActive = node.path === activeFile;
            return [
              <li
                key={node.path}
                role="treeitem"
                data-path={node.path}
                aria-level={depth}
                aria-expanded={isFolder ? isOpen : undefined}
                aria-selected={isSelected}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={node.path === tabStop ? 0 : -1}
                title={node.path.slice(1)}
                onFocus={() => setFocused(node.path)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!renaming) activate(node);
                }}
                onContextMenu={(event) => onRowContextMenu(event, node)}
                style={{ paddingLeft: `${(depth - 1) * INDENT_REM + 0.25}rem` }}
                className={cn(
                  'group/row text-body-sm relative flex h-7 cursor-pointer items-center gap-1.5 pr-1 select-none',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                  isSelected
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                {isFolder ? (
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 shrink-0 motion-safe:transition-transform',
                      isOpen && 'rotate-90',
                    )}
                  />
                ) : (
                  <span aria-hidden="true" className="w-4 shrink-0" />
                )}
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isFolder ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                {renaming ? (
                  draftInput(`New name for ${node.name}`)
                ) : (
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-mono',
                      isActive && 'text-foreground font-medium',
                    )}
                  >
                    {node.name}
                  </span>
                )}
                {locked && !isFolder ? (
                  <span className="text-muted-foreground shrink-0">
                    <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">({LOCKED_HINT})</span>
                  </span>
                ) : null}
                {!renaming ? (
                  // Pointer and touch only: keyboard users have Shift+F10.
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      const box = event.currentTarget.getBoundingClientRect();
                      openMenuAt(node, box.left, box.bottom);
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-sm lg:opacity-0 lg:group-hover/row:opacity-100"
                  >
                    <Ellipsis className="h-4 w-4" />
                  </button>
                ) : null}
              </li>,
              editing?.mode !== 'rename' &&
              editing?.parent === node.path &&
              isFolder ? (
                <li key={`${node.path}::new`} role="none">
                  <ul role="none">{newRow(depth)}</ul>
                </li>
              ) : null,
            ];
          })}
        </ul>
        {rows.length === 0 && !editing ? (
          <p className="text-muted-foreground text-caption px-4 py-2">
            No files yet. Right-click here to add one.
          </p>
        ) : null}
      </div>

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={
            menu.node ? `Actions for ${menu.node.name}` : 'Project actions'
          }
          items={menuItems(menu.node)}
          onClose={closeMenu}
        />
      ) : null}
    </SidebarSection>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring flex h-7 w-7 cursor-pointer items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}
