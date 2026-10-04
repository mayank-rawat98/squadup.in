import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import type { SandboxFiles } from '../../sandboxes/utils/sandbox-files';

/**
 * How a room's React project starts: from files the browser sends (the
 * scaffold) or as a copy of one of your saved sandboxes. Send exactly one.
 */
export class StartBoardSandboxDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4', { message: 'Choose one of your sandboxes to bring in.' })
  sandboxId?: string;

  /** Checked in full by findSandboxFilesProblem in the service. */
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      '/src/App.tsx': 'export default function App() { return <h1>Hi</h1>; }',
    },
  })
  @IsOptional()
  @IsObject({ message: 'Send the project files as an object.' })
  files?: SandboxFiles;
}
