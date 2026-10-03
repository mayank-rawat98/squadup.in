import { Spinner } from '@squadup.in/ui';

export default function BoardRoomLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label="Opening the room" />
    </div>
  );
}
