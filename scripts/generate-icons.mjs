// Generates every raster app icon from the single source of truth, src/app/icon.svg.
// Usage: node scripts/generate-icons.mjs   (sharp ships with Next.js, so no extra install is needed)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const svg = await readFile(path.join(root, "src/app/icon.svg"));
const BACKGROUND = "#FAF6EB";

async function flat(size, inner = size) {
  // Full-bleed background with the artwork centred: iOS and maskable icons must not have transparent corners.
  const art = await sharp(svg).resize(inner, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: art, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const outputs = [
  ["public/icon-192.png", () => sharp(svg).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()],
  ["public/icon-512.png", () => sharp(svg).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()],
  ["public/icon-maskable-512.png", () => flat(512, 400)],
  ["src/app/apple-icon.png", () => flat(180, 180)],
];

for (const [file, make] of outputs) {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await make());
  console.log("wrote", file);
}
