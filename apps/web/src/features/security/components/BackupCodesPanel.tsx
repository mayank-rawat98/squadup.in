'use client';

import { useId, useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, Button, Checkbox, Typography } from '@squadup.in/ui';
import {
  BACKUP_CODES_FILE_NAME,
  backupCodesFileContents,
} from '../utils/backup-codes';
import CopyButton from './CopyButton';

/*
 * The only time the plain codes exist outside the API's hash. They are shown
 * once, with copy and download, and the panel can't be closed until the user
 * says they've saved them.
 */

export interface BackupCodesPanelProps {
  codes: readonly string[];
  email: string;
  onDone: () => void;
}

export default function BackupCodesPanel({
  codes,
  email,
  onDone,
}: BackupCodesPanelProps) {
  const [saved, setSaved] = useState(false);
  const checkboxId = useId();
  const text = codes.join('\n');

  const download = () => {
    const blob = new Blob([backupCodesFileContents(codes, email, new Date())], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = BACKUP_CODES_FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning">
        Save these backup codes now. Each one signs you in once if you lose your
        phone, and you won&apos;t see them again.
      </Alert>

      <ul
        aria-label="Backup codes"
        className="bg-muted grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg p-4 font-mono text-body-sm xs:grid-cols-2"
      >
        {codes.map((code) => (
          <li key={code} className="text-foreground tracking-wider">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} label="Copy codes" />
        <Button variant="outline" size="sm" onClick={download}>
          <Download aria-hidden="true" className="h-4 w-4" />
          Download .txt
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          className="mt-0.5"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
        />
        <label htmlFor={checkboxId} className="text-body-sm cursor-pointer">
          I&apos;ve saved these codes somewhere safe.
        </label>
      </div>

      <div>
        <Button onClick={onDone} disabled={!saved}>
          Done
        </Button>
        {!saved ? (
          <Typography variant="caption" className="text-muted-foreground mt-2">
            Tick the box above once your codes are saved.
          </Typography>
        ) : null}
      </div>
    </div>
  );
}
