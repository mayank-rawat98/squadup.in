import { PartialType } from '@nestjs/swagger';
import { CreateBlogDto } from './create-blog.dto';

/**
 * Edit screen — every field is optional. Status transitions ("Publish",
 * "Schedule") are handled by the dedicated endpoints, but status may also be
 * changed here when saving an edit.
 */
export class UpdateBlogDto extends PartialType(CreateBlogDto) {}
