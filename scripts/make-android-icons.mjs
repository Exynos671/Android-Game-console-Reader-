/**
 * Replaces the default Capacitor launcher icons with the app icon.
 * Run: node scripts/make-android-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('public/pwa-512x512.png');
const RES = path.resolve('android/app/src/main/res');

async function main() {
  const src = sharp(SRC);
  const meta = await src.metadata();
  console.log('source icon', meta.width, 'x', meta.height);
  const dirs = fs.readdirSync(RES).filter((d) => d.startsWith('mipmap'));
  let count = 0;
  for (const dir of dirs) {
    const full = path.join(RES, dir);
    for (const name of fs.readdirSync(full)) {
      if (!/^ic_launcher(_round|_foreground)?\.png$/.test(name)) continue;
      const file = path.join(full, name);
      const m = await sharp(file).metadata();
      const w = m.width || 48;
      const h = m.height || w;
      await sharp(SRC)
        .resize(w, h, { fit: 'fill' })
        .png()
        .toFile(file);
      count++;
      console.log(`replaced ${dir}/${name} (${w}x${h})`);
    }
  }
  console.log('done, icons replaced:', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
