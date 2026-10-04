import { Typography } from '@squadup.in/ui';
import CreateRoomCard from './CreateRoomCard';
import JoinRoomCard from './JoinRoomCard';
import YourRooms from './YourRooms';

/* /board: join a room by its ID, start one, or reopen one you're in. */
export default function BoardLobby() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-2xl flex-col gap-2">
        <Typography as="h1" variant="h2">
          Code together in a room
        </Typography>
        <Typography variant="bodyMuted">
          Write code, sketch on a whiteboard and chat with your squad in one
          shared room. Every room has a five-character ID: enter one to join, or
          start a room and share its ID.
        </Typography>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <JoinRoomCard />
        <CreateRoomCard />
      </div>
      <YourRooms />
    </div>
  );
}
