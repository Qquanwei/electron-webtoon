/**
 * 从项目根目录 icon.png 生成安装包与运行时使用的图标资源。
 * 输出：正方形、圆角、透明底（桌面图标无白边）。
 */
import { execSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "icon.png");
const ASSETS = join(ROOT, "assets");
const ICONS_DIR = join(ASSETS, "icons");

const MASTER_SIZE = 1024;
const CONTENT_RATIO = 0.8;
const CORNER_RATIO = 0.185;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const PNG_SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];

const MAC_ICONSET = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

async function buildRoundedArtwork(size) {
  const content = Math.round(size * CONTENT_RATIO);
  const radius = Math.round(content * CORNER_RATIO);
  const offset = Math.round((size - content) / 2);
  const shadowOffset = Math.max(2, Math.round(size * 0.014));
  const shadowBlur = Math.max(6, Math.round(size * 0.028));

  const fitted = await sharp(SRC)
    .resize(content, content, {
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${content}" height="${content}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${content}" height="${content}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`,
  );

  const rounded = await sharp(fitted)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const shadowAlpha = await sharp(rounded)
    .ensureAlpha()
    .extractChannel("alpha")
    .blur(shadowBlur)
    .linear(0.28, 0)
    .toBuffer();

  const shadow = await sharp({
    create: {
      width: content,
      height: content,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .joinChannel(shadowAlpha)
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([
      {
        input: shadow,
        left: offset + shadowOffset,
        top: offset + shadowOffset,
        blend: "over",
      },
      {
        input: rounded,
        left: offset,
        top: offset,
      },
    ])
    .png()
    .toBuffer();
}

async function writePng(buffer, targetPath) {
  await writeFile(targetPath, buffer);
}

async function generatePngSet(master) {
  await mkdir(ICONS_DIR, { recursive: true });

  await writePng(master, join(ASSETS, "icon.png"));

  await Promise.all(
    PNG_SIZES.map(async (size) => {
      const file =
        size === 1024
          ? join(ICONS_DIR, "1024x1024.png")
          : join(ICONS_DIR, `${size}x${size}.png`);
      const buf =
        size === MASTER_SIZE
          ? master
          : await sharp(master).resize(size, size).png().toBuffer();
      await writePng(buf, file);
    }),
  );
}

async function generateIcns(master) {
  if (process.platform !== "darwin") {
    console.log("skip icon.icns (not on macOS)");
    return;
  }

  const iconset = join(ASSETS, "icon.iconset");
  await rm(iconset, { recursive: true, force: true });
  await mkdir(iconset, { recursive: true });

  await Promise.all(
    MAC_ICONSET.map(async ({ name, size }) => {
      const buf =
        size === MASTER_SIZE
          ? master
          : await sharp(master).resize(size, size).png().toBuffer();
      await writePng(buf, join(iconset, name));
    }),
  );

  execSync(`iconutil -c icns "${iconset}" -o "${join(ASSETS, "icon.icns")}"`, {
    stdio: "inherit",
  });
  await rm(iconset, { recursive: true, force: true });
}

async function generateIco(master) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = await Promise.all(
    sizes.map((size) => sharp(master).resize(size, size).png().toBuffer()),
  );

  const { default: toIco } = await import("to-ico");
  const ico = await toIco(images);
  await writeFile(join(ASSETS, "icon.ico"), ico);
}

async function main() {
  console.log("Generating icons from", SRC);
  const master = await buildRoundedArtwork(MASTER_SIZE);
  await generatePngSet(master);
  await generateIcns(master);
  await generateIco(master);
  console.log("Done -> assets/icon.png, icon.icns, icon.ico, icons/*");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
