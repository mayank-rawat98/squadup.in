import sharp from 'sharp';

/** WebP quality for re-encoded uploads (0-100). */
const WEBP_QUALITY = 82;

/**
 * Longest edge kept, in px. Wide enough for a full-bleed cover on a retina
 * display; anything larger is only bytes the reader downloads and never sees.
 */
const MAX_DIMENSION = 2400;

export interface OptimizedImage {
  buffer: Buffer;
  mimetype: 'image/webp';
  extension: 'webp';
}

/**
 * Re-encode an uploaded raster image as WebP for public delivery.
 *
 * Applies the EXIF orientation before metadata is dropped — otherwise a phone
 * photo keeps its pixels but loses the tag that said which way up they go, and
 * renders sideways. Metadata is not carried over, so camera GPS data never
 * reaches a public bucket. Images are only ever shrunk, never enlarged.
 */
export async function optimizeImageToWebp(
  input: Buffer,
): Promise<OptimizedImage> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer, mimetype: 'image/webp', extension: 'webp' };
}
