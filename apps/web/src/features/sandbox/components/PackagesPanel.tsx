'use client';

import { type FormEvent, useId, useState } from 'react';
import { useSandpack } from '@codesandbox/sandpack-react';
import { Plus, X } from 'lucide-react';
import { Button, Input } from '@squadup.in/ui';
import {
  SANDBOX_PACKAGE_JSON,
  SANDBOX_REQUIRED_PACKAGES,
} from '../constants/sandbox.constant';
import {
  addDependency,
  parsePackageSpec,
  readDependencies,
  removeDependency,
} from '../utils/package-json';

export interface PackagesPanelProps {
  packageJson: string;
}

/*
 * npm packages for the project, written to package.json's dependencies.
 * The preview installs them from npm when package.json changes; a download
 * installs them with `npm install`.
 */
export default function PackagesPanel({ packageJson }: PackagesPanelProps) {
  const { sandpack } = useSandpack();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const dependencies = readDependencies(packageJson);

  const write = (next: string | null) => {
    if (next === null) {
      setError("package.json isn't valid JSON, so packages can't be changed.");
      return false;
    }
    sandpack.updateFile(SANDBOX_PACKAGE_JSON, next);
    return true;
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    const spec = parsePackageSpec(draft);
    if ('error' in spec) {
      setError(spec.error);
      return;
    }
    if (write(addDependency(packageJson, spec.name, spec.version))) {
      setDraft('');
      setError(null);
    }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col">
      <div className="flex h-10 items-center px-4">
        <h2
          id={`${id}-heading`}
          className="text-muted-foreground text-caption font-semibold"
        >
          Packages
        </h2>
      </div>
      <form onSubmit={add} className="flex flex-col gap-2 px-3 pb-2">
        <label htmlFor={`${id}-input`} className="sr-only">
          Package to add, for example zod or zod@3
        </label>
        <div className="flex gap-1.5">
          <Input
            id={`${id}-input`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            placeholder="zod or zod@3"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-9 min-w-0 font-mono text-body-sm"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="h-9 w-9 shrink-0 px-0"
            aria-label="Add package"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-danger text-caption"
          >
            {error}
          </p>
        ) : null}
      </form>
      <ul className="flex flex-col pb-3">
        {dependencies.map(([name, version]) => (
          <li
            key={name}
            className="text-body-sm flex items-center gap-2 py-1 pr-1 pl-4"
          >
            <span className="min-w-0 flex-1 truncate font-mono">{name}</span>
            <span className="text-muted-foreground text-caption shrink-0 font-mono">
              {version}
            </span>
            {SANDBOX_REQUIRED_PACKAGES.includes(name) ? (
              <span className="w-7 shrink-0" />
            ) : (
              <button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => write(removeDependency(packageJson, name))}
                className="text-muted-foreground hover:text-danger focus-visible:ring-ring flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
