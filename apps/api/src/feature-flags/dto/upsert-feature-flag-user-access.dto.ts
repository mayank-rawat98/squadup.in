import { IsBoolean } from 'class-validator';

export class UpsertFeatureFlagUserAccessDto {
  @IsBoolean()
  enabled!: boolean;
}
