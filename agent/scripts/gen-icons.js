'use strict';

/**
 * Genera los iconos del agente a partir de ../brand/colors.json (que escribe
 * `pnpm brand` en dashboard/ desde la semilla del tema), sin dependencias:
 * un rasterizador minimo con supermuestreo y un codificador PNG con zlib.
 *
 *   assets/trayTemplate.png, @2x   macOS: glifo negro con alfa (template image,
 *                                  el sistema lo pinta claro/oscuro segun la barra)
 *   assets/tray.png, @2x           Windows/Linux: glifo con el degradado de marca
 *   assets/brand.css               variables CSS para status.html
 *   build/icon.png                 icono de la app (512), electron-builder
 *                                  deriva .icns e .ico de aqui
 *
 *   npm run icons
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const BRAND_FILE = path.join(ROOT, '..', 'brand', 'colors.json');
const brand = JSON.parse(fs.readFileSync(BRAND_FILE, 'utf8'));

// ---- geometria del glifo (la vela), en coordenadas 0..1 --------------------
// Dos triangulos (vela mayor y foque) y el casco. Mismo dibujo que app/logo.tsx.
const SAIL_MAIN = [
  [0.53, 0.08],
  [0.53, 0.68],
  [0.17, 0.68],
];
const SAIL_JIB = [
  [0.6, 0.18],
  [0.6, 0.68],
  [0.83, 0.68],
];
const HULL = [
  [0.1, 0.76],
  [0.9, 0.76],
  [0.8, 0.9],
  [0.2, 0.9],
];

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function inside(poly, x, y) {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

function roundedSquare(x, y, r) {
  const d = 0.5 - r;
  const cx = Math.abs(x - 0.5);
  const cy = Math.abs(y - 0.5);
  if (cx <= d || cy <= d) return cx <= 0.5 && cy <= 0.5;
  return (cx - d) ** 2 + (cy - d) ** 2 <= r * r;
}

/**
 * Pinta una imagen RGBA de `size` px. `shape(x,y)` devuelve el color RGBA
 * (0..255) del punto en coordenadas 0..1 o null si esta fuera. Supermuestreo 4x4.
 */
function raster(size, shape) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = shape(u, v);
          if (c) {
            r += c[0] * c[3];
            g += c[1] * c[3];
            b += c[2] * c[3];
            a += c[3];
          }
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        px[i] = Math.round(r / a);
        px[i + 1] = Math.round(g / a);
        px[i + 2] = Math.round(b / a);
        px[i + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
  }
  return px;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- colores ---------------------------------------------------------------
const FROM = hex(brand.gradient.from);
const TO = hex(brand.gradient.to);
const ANGLE = ((brand.gradient.angle ?? 100) * Math.PI) / 180;
const DARK_SURFACE = hex(brand.dark.surface);
const HULL_COLOR = hex(brand.dark.muted);

function gradientAt(x, y) {
  // proyeccion sobre el eje del degradado, como CSS linear-gradient(angle)
  const dx = Math.sin(ANGLE);
  const dy = -Math.cos(ANGLE);
  const t = Math.min(1, Math.max(0, ((x - 0.5) * dx + (y - 0.5) * dy) / Math.SQRT2 + 0.5));
  return [
    Math.round(FROM[0] + (TO[0] - FROM[0]) * t),
    Math.round(FROM[1] + (TO[1] - FROM[1]) * t),
    Math.round(FROM[2] + (TO[2] - FROM[2]) * t),
  ];
}

// glifo solo (tray): la vela con degradado o negra, casco apagado
const glyph = (mono) => (x, y) => {
  if (inside(SAIL_MAIN, x, y)) return mono ? [0, 0, 0, 1] : [...gradientAt(x, y), 1];
  if (inside(SAIL_JIB, x, y)) return mono ? [0, 0, 0, 0.7] : [...gradientAt(x, y), 0.8];
  if (inside(HULL, x, y)) return mono ? [0, 0, 0, 1] : [...HULL_COLOR, 1];
  return null;
};

// icono de app: placa oscura redondeada con el glifo dentro
const appIcon = (x, y) => {
  if (!roundedSquare(x, y, 0.22)) return null;
  const gx = (x - 0.5) * 1.35 + 0.5;
  const gy = (y - 0.5) * 1.35 + 0.5;
  const g = glyph(false)(gx, gy);
  return g || [...DARK_SURFACE, 1];
};

const ASSETS = path.join(ROOT, 'assets');
const BUILD = path.join(ROOT, 'build');
fs.mkdirSync(ASSETS, { recursive: true });
fs.mkdirSync(BUILD, { recursive: true });

const write = (file, size, shape) => {
  fs.writeFileSync(file, png(size, raster(size, shape)));
  console.log(`${path.relative(ROOT, file)}  ${size}x${size}`);
};

write(path.join(ASSETS, 'trayTemplate.png'), 16, glyph(true));
write(path.join(ASSETS, 'trayTemplate@2x.png'), 32, glyph(true));
write(path.join(ASSETS, 'tray.png'), 16, glyph(false));
write(path.join(ASSETS, 'tray@2x.png'), 32, glyph(false));
write(path.join(ASSETS, 'logo.png'), 128, glyph(false));
write(path.join(BUILD, 'icon.png'), 512, appIcon);

fs.writeFileSync(
  path.join(ASSETS, 'brand.css'),
  `/* generado por scripts/gen-icons.js desde brand/colors.json — no editar */
:root {
  --brand-from: ${brand.gradient.from};
  --brand-to: ${brand.gradient.to};
  --brand-angle: ${brand.gradient.angle ?? 100}deg;
  --primary-400: ${brand.primary['400']};
  --primary-600: ${brand.primary['600']};
  --accent-500: ${brand.accent['500']};
  --surface: ${brand.dark.surface};
  --raised: ${brand.dark.raised};
  --text: ${brand.dark.text};
  --muted: ${brand.dark.muted};
}
`
);
console.log('assets/brand.css');
