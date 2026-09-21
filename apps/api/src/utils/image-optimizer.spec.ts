import sharp from 'sharp';
import { optimizeImageToWebp } from './image-optimizer';

describe('optimizeImageToWebp', () => {
  const png = (width: number, height: number) =>
    sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .png()
      .toBuffer();

  it('re-encodes an upload as WebP', async () => {
    const result = await optimizeImageToWebp(await png(40, 20));
    const meta = await sharp(result.buffer).metadata();

    expect(result.mimetype).toBe('image/webp');
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([40, 20]);
  });

  it('caps the longest edge and keeps the aspect ratio', async () => {
    const result = await optimizeImageToWebp(await png(4800, 1200));
    const meta = await sharp(result.buffer).metadata();

    expect([meta.width, meta.height]).toEqual([2400, 600]);
  });

  it('rejects bytes that are not an image', async () => {
    await expect(
      optimizeImageToWebp(Buffer.from('not an image')),
    ).rejects.toThrow();
  });
});
