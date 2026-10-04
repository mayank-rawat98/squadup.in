import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SandboxIdDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'That sandbox link isn’t valid. Check the address.' })
  id!: string;
}
