import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';
import { SANDBOX_NAME_MAX_LENGTH } from '../constants/sandbox.constants';
import type { SandboxFiles } from '../utils/sandbox-files';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSandboxDto {
  @ApiProperty({ example: 'Todo app', maxLength: SANDBOX_NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Give the sandbox a name so you can find it later.' })
  @MaxLength(SANDBOX_NAME_MAX_LENGTH, {
    message: `Sandbox names can be up to ${SANDBOX_NAME_MAX_LENGTH} characters.`,
  })
  name!: string;

  /** Checked in full by findSandboxFilesProblem in the service. */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      '/src/App.tsx': 'export default function App() { return <h1>Hi</h1>; }',
    },
  })
  @IsObject({ message: 'Send the project files as an object.' })
  files!: SandboxFiles;
}
