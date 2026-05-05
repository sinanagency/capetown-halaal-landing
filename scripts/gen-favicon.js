const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/milaaj/Code/capetown-halaal-landing';
const SVG = fs.readFileSync(path.join(ROOT, 'public/icon.svg'));

async function pngFromSvg(size) {
  return await sharp(SVG, { density: 384 }).resize(size, size).png().toBuffer();
}

function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dir = Buffer.alloc(16);
  dir.writeUInt8(size === 256 ? 0 : size, 0);
  dir.writeUInt8(size === 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2);
  dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(pngBuffer.length, 8);
  dir.writeUInt32LE(22, 12);

  return Buffer.concat([header, dir, pngBuffer]);
}

(async () => {
  const png32 = await pngFromSvg(32);
  const ico = pngToIco(png32, 32);
  fs.writeFileSync(path.join(ROOT, 'public/favicon.ico'), ico);
  fs.writeFileSync(path.join(ROOT, 'src/app/favicon.ico'), ico);
  console.log('favicon.ico written (PNG-in-ICO, 32x32, ' + ico.length + ' bytes)');

  const png192 = await pngFromSvg(192);
  fs.writeFileSync(path.join(ROOT, 'public/icon-192.png'), png192);
  console.log('icon-192.png written (' + png192.length + ' bytes)');

  const png512 = await pngFromSvg(512);
  fs.writeFileSync(path.join(ROOT, 'public/icon-512.png'), png512);
  console.log('icon-512.png written (' + png512.length + ' bytes)');

  const png180 = await pngFromSvg(180);
  fs.writeFileSync(path.join(ROOT, 'public/apple-touch-icon.png'), png180);
  console.log('apple-touch-icon.png written (' + png180.length + ' bytes)');
})();
