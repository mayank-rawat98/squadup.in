/*
 * Renders the raster brand icons from the SVG mark, so no one needs an image
 * editor to change them. Run after editing apps/web/src/app/icon.svg:
 *
 *   node tools/generate-brand-icons.mjs
 *
 * It uses Next's own renderer (next/og), which is already a dependency. The
 * outputs are committed; nothing runs at build time.
 *
 *   apps/{web,ops}/src/app/favicon.ico      16, 32 and 48px, for /favicon.ico
 *   apps/{web,ops}/src/app/apple-icon.png   180px, for iOS home screens
 *   apps/web/public/icon-192.png, icon-512.png   for the web app manifest
 *   apps/web/src/app/opengraph-image.png    1200x630 link preview
 *
 * The link preview is set in Inter, fetched once from Google Fonts while the
 * script runs, so it needs a network connection. Its copy and colours repeat
 * SITE and BRAND_COLORS from apps/web/src/config/site.ts; change both.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ImageResponse } from 'next/og.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'apps/web/src/app/icon.svg'), 'utf8');
const toDataUri = (markup) =>
  `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
const rounded = toDataUri(svg);
// iOS masks home-screen icons itself, so the apple icon fills the square.
const square = toDataUri(svg.replace('rx="9"', 'rx="0"'));

async function renderPng(size, src = rounded) {
  const element = {
    type: 'img',
    props: { src, width: size, height: size },
  };
  const response = new ImageResponse(element, { width: size, height: size });
  return Buffer.from(await response.arrayBuffer());
}

/* An ICO whose entries are PNGs, which every current browser accepts. */
function toIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size % 256, 0);
    entry.writeUInt8(size % 256, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
}

const icoSizes = [16, 32, 48];
const ico = toIco(
  await Promise.all(
    icoSizes.map(async (size) => ({ size, data: await renderPng(size) })),
  ),
);
const apple = await renderPng(180, square);

for (const app of ['web', 'ops']) {
  writeFileSync(join(root, `apps/${app}/src/app/favicon.ico`), ico);
  writeFileSync(join(root, `apps/${app}/src/app/apple-icon.png`), apple);
}
const OG = {
  primary: '#7c3aed',
  background: '#fcfbfe',
  foreground: '#171221',
  muted: '#6b6475',
};

async function loadInter(weight) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`)
  ).text();
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`No Inter ${weight} TTF in the Google Fonts CSS.`);
  return Buffer.from(await (await fetch(url)).arrayBuffer());
}

/* Satori takes the same tree JSX would build, written out as objects. */
const h = (type, style, ...children) => ({
  type,
  props: { style: { display: 'flex', ...style }, children },
});

async function renderOpenGraph() {
  const [regular, bold] = await Promise.all([loadInter(400), loadInter(700)]);
  const card = h(
    'div',
    {
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 88,
      background: OG.background,
      color: OG.foreground,
      fontFamily: 'Inter',
    },
    h(
      'div',
      { alignItems: 'center', gap: 22 },
      { type: 'img', props: { src: rounded, width: 88, height: 88 } },
      h(
        'div',
        { fontSize: 60, fontWeight: 700, letterSpacing: -1.5 },
        'squad',
        h('span', { color: OG.primary }, 'up'),
      ),
    ),
    h(
      'div',
      { flexDirection: 'column', gap: 28 },
      h(
        'div',
        {
          flexDirection: 'column',
          fontSize: 84,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1.05,
        },
        h('span', {}, 'Compete. Collaborate.'),
        h('span', { color: OG.primary }, 'Win together.'),
      ),
      h(
        'div',
        { fontSize: 34, color: OG.muted },
        'Proctored coding arenas for student developers.',
      ),
    ),
    h(
      'div',
      { fontSize: 30, fontWeight: 700, color: OG.primary },
      'squadup.in',
    ),
  );
  const response = new ImageResponse(card, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    ],
  });
  return Buffer.from(await response.arrayBuffer());
}

copyFileSync(
  join(root, 'apps/web/src/app/icon.svg'),
  join(root, 'apps/ops/src/app/icon.svg'),
);
writeFileSync(join(root, 'apps/web/public/icon-192.png'), await renderPng(192));
writeFileSync(join(root, 'apps/web/public/icon-512.png'), await renderPng(512));

writeFileSync(
  join(root, 'apps/web/src/app/opengraph-image.png'),
  await renderOpenGraph(),
);

console.log('Brand icons written.');
