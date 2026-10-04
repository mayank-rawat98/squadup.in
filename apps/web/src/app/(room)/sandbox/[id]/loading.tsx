import { Spinner } from '@squadup.in/ui';

export default function SandboxWorkspaceLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label="Opening the sandbox" />
    </div>
  );
}
