import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SANDBOX_NAME_MAX_LENGTH } from '../constants/sandbox.constants';
import type { SandboxFiles } from '../utils/sandbox-files';

/** Rename, save the files, or both. `files` replaces the whole project. */
export class UpdateSandboxDto {
  @ApiPropertyOptional({ maxLength: SANDBOX_NAME_MAX_LENGTH })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Sandbox names can’t be empty.' })
  @MaxLength(SANDBOX_NAME_MAX_LENGTH, {
    message: `Sandbox names can be up to ${SANDBOX_NAME_MAX_LENGTH} characters.`,
  })
  name?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject({ message: 'Send the project files as an object.' })
  files?: SandboxFiles;
}
