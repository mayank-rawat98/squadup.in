import { Spinner } from '@squadup.in/ui';

export default function SandboxPreviewLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label="Starting the preview" />
    </div>
  );
}
