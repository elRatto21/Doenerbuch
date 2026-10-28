/** Renders the app icons from the logo SVG: pnpm icons */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const glyph = (stroke: string) => `
  <g fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20"/><path d="M7 6h10l-1 4H8z"/><path d="M6.5 10h11l-1.2 4.5H7.7z"/><path d="M8 14.5h8l-1 3.5H9z"/>
  </g>`;

function icon(size: number, { maskable = false } = {}) {
  // maskable icons need the glyph inside the 80% safe zone and a full-bleed background
  const pad = maskable ? size * 0.22 : size * 0.16;
  const glyphSize = size - pad * 2;
  const radius = maskable ? 0 : size * 0.22;
  const border = maskable ? 0 : Math.max(2, size * 0.035);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect x="${border / 2}" y="${border / 2}" width="${size - border}" height="${size - border}" rx="${radius}" fill="#C8321F" stroke="#1B1A17" stroke-width="${border}"/>
    <g transform="translate(${pad} ${pad}) scale(${glyphSize / 24})">${glyph("#FFFFFF")}</g>
  </svg>`;
}

async function main() {
  await mkdir("public/icons", { recursive: true });
  const jobs: [string, string][] = [
    ["public/icons/icon-192.png", icon(192)],
    ["public/icons/icon-512.png", icon(512)],
    ["public/icons/icon-maskable-512.png", icon(512, { maskable: true })],
    ["public/icons/apple-touch-icon.png", icon(180, { maskable: true })],
    ["public/favicon.png", icon(64)],
  ];
  for (const [file, svg] of jobs) await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("Icons written to public/icons");
}

void main();
