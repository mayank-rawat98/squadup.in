'use client';

import { Alert, Spinner } from '@squadup.in/ui';
import type { BoardSocket } from '../hooks/use-board-connection';
import { useRoomSandbox } from '../hooks/use-room-sandbox';
import SharedProjectWorkspace, {
  type SharedProjectWorkspaceProps,
} from './SharedProjectWorkspace';
import StartRoomSandbox from './StartRoomSandbox';

export interface RoomSandboxProps
  extends Omit<SharedProjectWorkspaceProps, 'doc' | 'awareness'> {
  socket: BoardSocket | undefined;
}

/* The room's React tab: open the shared project, or offer to start it. */
export default function RoomSandbox({ socket, ...props }: RoomSandboxProps) {
  const connection = useRoomSandbox(socket, props.code);

  if (!connection || connection.status === 'connecting') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Opening the React project" />
      </div>
    );
  }

  if (connection.status === 'refused') {
    return (
      <div className="p-4">
        <Alert tone="danger">{connection.error}</Alert>
      </div>
    );
  }

  if (connection.status === 'not-started') {
    return <StartRoomSandbox code={props.code} roomName={props.roomName} />;
  }

  return (
    <SharedProjectWorkspace
      doc={connection.doc}
      awareness={connection.awareness}
      {...props}
    />
  );
}
