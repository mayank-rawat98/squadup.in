import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsString } from 'class-validator';

export class DeleteBucketItemsDto {
  @ApiProperty({
    description: 'A list of filenames to delete from the bucket.',
    example: ['file1.txt', 'image.png'],
  })
  @ArrayNotEmpty()
  @IsString({ each: true })
  filenames!: string[];
}
