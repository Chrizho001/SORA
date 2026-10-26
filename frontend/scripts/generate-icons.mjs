import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const iconsDir = path.join(publicDir, "icons");
const sourceSvg = path.join(publicDir, "icon.svg");

async function generate() {
  console.log("Generating PWA icons from:", sourceSvg);
  await fs.mkdir(iconsDir, { recursive: true });

  const svgBuffer = await fs.readFile(sourceSvg);

  // 1. icon-192.png
  console.log("Generating icon-192.png...");
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, "icon-192.png"));

  // 2. icon-512.png
  console.log("Generating icon-512.png...");
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, "icon-512.png"));

  // 3. icon-maskable-512.png with ~10% safe-zone padding on brand background (#111318)
  console.log("Generating icon-maskable-512.png...");
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="512" height="512">
  <rect width="120" height="120" fill="#111318" />
  <g transform="translate(18, 18) scale(0.70)" fill="#ffffff" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M14 34 L110 8 L78 40 L42 40 L42 70 L14 98 Z" />
    <path d="M106 86 L10 112 L42 80 L78 80 L78 50 L106 22 Z" />
  </g>
</svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));

  console.log("Successfully generated all icons in public/icons/:");
  console.log(" - icon-192.png");
  console.log(" - icon-512.png");
  console.log(" - icon-maskable-512.png");
}

generate().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
