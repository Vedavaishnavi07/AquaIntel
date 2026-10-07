import sharp from "sharp";
import { readFile } from "node:fs/promises";
const svg = await readFile("apps/web/public/icon.svg");
for (const size of [192, 512])
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile("apps/web/public/icon-" + size + ".png");
console.log("PWA icons generated");
