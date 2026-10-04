'use client';

import { useEffect, useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Save } from 'lucide-react';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';
import { Button, cn, toast } from '@squadup.in/ui';
import {
  FileExplorer,
  LivePreview,
  PackagesPanel,
  PreviewConsole,
  SANDBOX_NAME_MAX_LENGTH,
  SANDBOX_PACKAGE_JSON,
  SANDBOX_QUERY_KEYS,
  SidebarSection,
  createSandbox,
  downloadProject,
  sandboxWorkspacePath,
  useBundlerPreview,
  useSharedProject,
} from '@/features/sandbox';
import { getErrorMessage } from '@/lib/api';
import { editorLanguageOf } from '../utils/editor-language';
import CodeEditor from './editor/LazyCodeEditor';

type Panel = 'files' | 'code' | 'preview';

const PANELS: readonly { id: Panel; label: string }[] = [
  { id: 'files', label: 'Files' },
  { id: 'code', label: 'Code' },
  { id: 'preview', label: 'Preview' },
];

/** Who you are to y-codemirror: it draws your caret in their editors from this. */
export interface ProjectUser {
  name: string;
  color: string;
  colorLight: string;
}

export interface SharedProjectWorkspaceProps {
  doc: Y.Doc;
  awareness: Awareness;
  code: string;
  roomName: string;
  user: ProjectUser;
  /** The file and line of the person you follow. */
  revealFile?: string;
  revealLine?: number;
  /** Reports the file you have open and your caret's line, for room presence. */
  onPresence: (presence: { file?: string; line?: number }) => void;
}

/*
 * The room's React project: files and packages, the shared editor, and the
 * live preview. Everyone edits the same files; each person runs their own
 * preview of them, so console output is yours alone. Wide screens show all
 * three panels; narrower ones switch between them, with each kept mounted
 * so the preview keeps running while you edit.
 */
export default function SharedProjectWorkspace({
  doc,
  awareness,
  code,
  roomName,
  user,
  revealFile,
  revealLine,
  onPresence,
}: SharedProjectWorkspaceProps) {
  const project = useSharedProject(doc);
  const preview = useBundlerPreview(project.files);
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>('code');
  const [filesOpen, setFilesOpen] = useState(true);
  const [packagesOpen, setPackagesOpen] = useState(true);
  const [line, setLine] = useState<number>();
  const sidebarId = useId();
  const { activeFile, openFile } = project;
  const text = activeFile ? project.textOf(activeFile) : undefined;

  const userKey = JSON.stringify(user);
  useEffect(() => {
    awareness.setLocalStateField('user', JSON.parse(userKey) as ProjectUser);
  }, [awareness, userKey]);

  useEffect(() => {
    if (revealFile) openFile(revealFile);
  }, [revealFile, openFile]);

  useEffect(() => {
    onPresence({ file: activeFile || undefined, line });
  }, [activeFile, line, onPresence]);

  const saveCopy = useMutation({
    mutationFn: () =>
      createSandbox({
        name: `${roomName} (room ${code})`.slice(0, SANDBOX_NAME_MAX_LENGTH),
        files: project.files,
      }),
    onSuccess: (sandbox) => {
      void queryClient.invalidateQueries({
        queryKey: SANDBOX_QUERY_KEYS.list(),
      });
      toast.success(`Saved a copy to your sandboxes as ${sandbox.name}.`, {
        action: {
          label: 'Open',
          onClick: () =>
            window.open(sandboxWorkspacePath(sandbox.id), '_blank', 'noopener'),
        },
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const show = (id: Panel) =>
    cn('min-h-0 min-w-0 flex-col lg:flex', panel === id ? 'flex' : 'hidden');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex flex-wrap items-center gap-2 border-b px-3 py-1.5">
        <p className="text-muted-foreground text-caption min-w-0 flex-1 truncate font-mono">
          {activeFile ? activeFile.slice(1) : 'No file open'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => saveCopy.mutate()}
          disabled={saveCopy.isPending}
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {saveCopy.isPending ? 'Saving…' : 'Save a copy'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadProject(roomName, project.files)}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Download</span>
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Project panel"
        className="border-border bg-muted/40 flex gap-0.5 border-b p-1 lg:hidden"
      >
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={panel === p.id}
            onClick={() => setPanel(p.id)}
            className={cn(
              'focus-visible:ring-ring h-8 flex-1 cursor-pointer rounded-md text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
              panel === p.id
                ? 'bg-card text-foreground shadow-1'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,1fr)]">
        <aside
          id={sidebarId}
          aria-label="Files and packages"
          className={cn(
            show('files'),
            'border-border bg-muted/40 w-full lg:w-auto lg:border-r',
          )}
        >
          <FileExplorer
            project={project}
            open={filesOpen}
            onToggle={() => setFilesOpen((value) => !value)}
            className={filesOpen ? 'flex-1' : 'shrink-0'}
          />
          <SidebarSection
            title="Packages"
            open={packagesOpen}
            onToggle={() => setPackagesOpen((value) => !value)}
            className={cn(
              'border-border border-t',
              filesOpen ? 'max-h-[45%] shrink-0' : 'flex-1',
            )}
          >
            <PackagesPanel
              packageJson={project.files[SANDBOX_PACKAGE_JSON] ?? ''}
              onChange={(next) =>
                project.updateFile(SANDBOX_PACKAGE_JSON, next)
              }
            />
          </SidebarSection>
        </aside>

        <section
          aria-label="Code editor"
          className={cn(show('code'), 'border-border w-full lg:border-r')}
        >
          {text ? (
            <CodeEditor
              text={text}
              awareness={awareness}
              language={editorLanguageOf(activeFile)}
              label={`Shared file ${activeFile.slice(1)}`}
              readOnly={activeFile === SANDBOX_PACKAGE_JSON}
              revealLine={revealFile === activeFile ? revealLine : undefined}
              onCaretLine={setLine}
            />
          ) : (
            <p className="text-muted-foreground text-body-sm p-6">
              Open a file from the list to edit it.
            </p>
          )}
        </section>

        <section aria-label="Preview" className={cn(show('preview'), 'w-full')}>
          <LivePreview preview={preview} />
          <PreviewConsole logs={preview.logs} onClear={preview.clearLogs} />
        </section>
      </div>
    </div>
  );
}
