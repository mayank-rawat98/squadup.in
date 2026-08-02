import { Button } from '@squadup.in/ui';

export default function Index() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight">squadup ops</h1>
        <p className="text-muted-foreground">
          Styled by <code className="font-mono">@squadup.in/ui</code> — the same
          design system web runs on.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </main>
  );
}
