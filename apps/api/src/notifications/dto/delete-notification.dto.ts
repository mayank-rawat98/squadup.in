import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class DeleteNotificationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  receiverIds!: string[];
}
