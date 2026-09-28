import { Spinner } from '@squadup.in/ui';

/*
 * What a guarded page shows while it works out who is looking. Taking the
 * page's place, rather than rendering the page and swapping it, is what stops
 * a signed-out visitor glimpsing the dashboard or a signed-in one the form.
 */
export default function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-1 items-center justify-center py-16">
      <Spinner size="lg" label={label} />
    </div>
  );
}
