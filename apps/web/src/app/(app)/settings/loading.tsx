import { Spinner } from '@squadup.in/ui';

export default function SettingsLoading() {
  return (
    <div className="flex justify-center py-10">
      <Spinner label="Loading settings" />
    </div>
  );
}
