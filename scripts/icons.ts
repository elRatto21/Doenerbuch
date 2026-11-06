/** Renders the app icons from the logo SVG: pnpm icons */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const glyph = (stroke: string) => `
  <g fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20"/><path d="M7 6h10l-1 4H8z"/><path d="M6.5 10h11l-1.2 4.5H7.7z"/><path d="M8 14.5h8l-1 3.5H9z"/>
  </g>`;

function icon(size: number, { maskable = false } = {}) {
  // Full-bleed square, no border, no transparent corners: launchers apply their own mask,
  // and anything transparent or dark at the edge shows up as a black frame.
  // Maskable icons keep the glyph inside the 80% safe zone.
  const pad = size * (maskable ? 0.2 : 0.17);
  const glyphSize = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#C8321F"/>
    <g transform="translate(${pad} ${pad}) scale(${glyphSize / 24})">${glyph("#FFFFFF")}</g>
  </svg>`;
}

async function main() {
  await mkdir("public/icons", { recursive: true });
  const jobs: [string, string][] = [
    ["public/icons/icon-192.png", icon(192)],
    ["public/icons/icon-512.png", icon(512)],
    ["public/icons/icon-1024.png", icon(1024)],
    ["public/icons/icon-maskable-512.png", icon(512, { maskable: true })],
    ["public/icons/icon-maskable-1024.png", icon(1024, { maskable: true })],
    ["public/icons/apple-touch-icon.png", icon(512)],
    ["public/favicon.png", icon(64)],
  ];
  for (const [file, svg] of jobs) await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("Icons written to public/icons");
}

void main();
