import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateBucketDto {
  @ApiProperty({
    description: 'The name of the bucket to create.',
    example: 'my-new-bucket',
  })
  @IsString()
  @IsNotEmpty()
  bucketName!: string;

  @ApiProperty({
    description: 'Whether the bucket should be public.',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isPublic!: boolean;
}
