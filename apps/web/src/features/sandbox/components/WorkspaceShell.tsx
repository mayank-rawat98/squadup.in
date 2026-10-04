'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { SandpackCodeEditor } from '@codesandbox/sandpack-react';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button, LogoMark, buttonVariants, cn } from '@squadup.in/ui';
import {
  SANDBOX_PACKAGE_JSON,
  SANDBOX_PATH,
  sandboxPreviewPath,
} from '../constants/sandbox.constant';
import { useAutosave } from '../hooks/use-autosave';
import { useBundlerPreview } from '../hooks/use-bundler-preview';
import { usePublishFiles } from '../hooks/use-preview-channel';
import { useSandpackProject } from '../hooks/use-sandpack-project';
import type { SandboxDetail } from '../types/sandbox.types';
import { downloadProject } from '../utils/project-zip';
import FileExplorer from './FileExplorer';
import LivePreview from './LivePreview';
import PackagesPanel from './PackagesPanel';
import PreviewConsole from './PreviewConsole';
import SandboxName from './SandboxName';
import SaveIndicator from './SaveIndicator';
import SidebarSection from './SidebarSection';

type View = 'files' | 'code' | 'preview';

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'files', label: 'Files' },
  { id: 'code', label: 'Code' },
  { id: 'preview', label: 'Preview' },
];

export interface WorkspaceShellProps {
  sandbox: SandboxDetail;
}

/*
 * The sandbox inside its SandpackProvider: files and packages, the editor,
 * and the live preview with its console. Wide screens show all three side
 * by side; narrower ones switch between them, and every panel stays mounted
 * so the preview keeps running while you edit.
 */
export default function WorkspaceShell({ sandbox }: WorkspaceShellProps) {
  const project = useSandpackProject();
  const { files } = project;
  const [name, setName] = useState(sandbox.name);
  const [view, setView] = useState<View>('code');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [packagesOpen, setPackagesOpen] = useState(true);
  const sidebarId = useId();
  const autosave = useAutosave(sandbox.id, files);
  usePublishFiles(sandbox.id, files);
  const preview = useBundlerPreview(files);

  const panel = (id: View) =>
    cn('min-h-0 min-w-0 flex-col lg:flex', view === id ? 'flex' : 'hidden');

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col overflow-hidden">
      <header className="border-border bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-8 w-8 px-0 lg:inline-flex"
          aria-label={
            sidebarOpen ? 'Hide files and packages' : 'Show files and packages'
          }
          aria-expanded={sidebarOpen}
          aria-controls={sidebarId}
          title={
            sidebarOpen ? 'Hide files and packages' : 'Show files and packages'
          }
          onClick={() => setSidebarOpen((value) => !value)}
        >
          {sidebarOpen ? (
            <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
          ) : (
            <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
        <Link
          href={SANDBOX_PATH}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'gap-1.5 px-2',
          )}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Sandboxes</span>
        </Link>
        <LogoMark className="hidden h-6 w-6 shrink-0 sm:block" />
        <h1 className="sr-only">{name}</h1>
        <SandboxName id={sandbox.id} name={name} onRenamed={setName} />
        <SaveIndicator status={autosave.status} onRetry={autosave.retry} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadProject(name, files)}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Download</span>
          </Button>
          <a
            href={sandboxPreviewPath(sandbox.id)}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">
              Open preview in new tab
            </span>
          </a>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Workspace panel"
        className="border-border bg-muted/40 flex gap-0.5 border-b p-1 lg:hidden"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'focus-visible:ring-ring h-8 flex-1 cursor-pointer rounded-md text-body-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
              view === v.id
                ? 'bg-card text-foreground shadow-1'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 lg:grid',
          sidebarOpen
            ? 'lg:grid-cols-[16rem_minmax(0,1fr)_minmax(0,1fr)]'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
        )}
      >
        <aside
          id={sidebarId}
          aria-label="Files and packages"
          className={cn(
            panel('files'),
            'border-border bg-muted/40 w-full lg:w-auto lg:border-r',
            !sidebarOpen && 'lg:hidden',
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
              packageJson={files[SANDBOX_PACKAGE_JSON] ?? ''}
              onChange={(next) =>
                project.updateFile(SANDBOX_PACKAGE_JSON, next)
              }
            />
          </SidebarSection>
        </aside>

        <section
          aria-label="Code editor"
          className={cn(panel('code'), 'border-border w-full lg:border-r')}
        >
          <SandpackCodeEditor
            showTabs
            closableTabs
            showLineNumbers
            showReadOnly
            style={{ height: '100%' }}
          />
        </section>

        <section
          aria-label="Preview"
          className={cn(panel('preview'), 'w-full')}
        >
          <LivePreview preview={preview} />
          <PreviewConsole logs={preview.logs} onClear={preview.clearLogs} />
        </section>
      </div>
    </div>
  );
}
