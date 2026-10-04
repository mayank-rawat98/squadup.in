import { Typography } from '@squadup.in/ui';
import CreateSandboxCard from './CreateSandboxCard';
import YourSandboxes from './YourSandboxes';

/* /sandbox: start a React sandbox or reopen one of yours. */
export default function SandboxLobby() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-2xl flex-col gap-2">
        <Typography as="h1" variant="h2">
          React sandbox
        </Typography>
        <Typography variant="bodyMuted">
          Write React and TypeScript in the browser and watch it run as you
          type. Add files and npm packages, open the preview in its own tab, and
          download the project to keep working on your laptop.
        </Typography>
      </header>
      <CreateSandboxCard />
      <YourSandboxes />
    </div>
  );
}
