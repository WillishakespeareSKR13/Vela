// La marca sale de un solo sitio: la semilla del tema (theme/_seed.ts) y los
// SVG de public/ (icon.svg, tray.svg, vela.svg). Este script:
//   1. vuelca los hex de la semilla a ../brand/colors.json;
//   2. reescribe el degradado de icon.svg con `from`/`to` de la semilla y
//      rasteriza (sharp, que ya trae Next) el favicon del panel y los iconos
//      del agente: icono de app, cabecera de la ventana y tray;
//   3. escribe agent/assets/brand.css para la ventana del agente.
// Uso: pnpm brand
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const { SEED, Vela } = await import("../theme/_seed.ts");

const HERE = dirname(fileURLToPath(import.meta.url));
const R = (...p) => resolve(HERE, "..", ...p);
const AGENT = (...p) => resolve(HERE, "..", "..", "agent", ...p);

const dark = Vela("dark");
const light = Vela("light");
const brand = dark.effects.gradients.brand;
const from = brand.stops[0].color;
const to = brand.stops[brand.stops.length - 1].color;

// 1 · colores
const colors = {
  name: SEED.name,
  gradient: { angle: brand.angle, from, to },
  primary: SEED.primary,
  accent: SEED.accent,
  tint: SEED.tint,
  dark: {
    surface: dark.colors.surface.base,
    raised: dark.colors.surface.raised,
    text: dark.colors.text.primary,
    muted: dark.colors.text.muted,
  },
  light: {
    surface: light.colors.surface.base,
    raised: light.colors.surface.raised,
    text: light.colors.text.primary,
    muted: light.colors.text.muted,
  },
};
mkdirSync(R("..", "brand"), { recursive: true });
writeFileSync(R("..", "brand", "colors.json"), JSON.stringify(colors, null, 2) + "\n");
console.log(`brand/colors.json ← ${from} → ${to} (${brand.angle}°)`);

// 2 · iconos. El degradado del SVG se sustituye por el de la semilla: asi el
// logo y el panel no pueden discrepar.
const retint = (svg) =>
  svg
    .replace(/stop-color="#[0-9a-fA-F]{6}"(?=\/>\s*<stop offset)/, `stop-color="${from}"`)
    .replace(/(<stop offset="1" stop-color=")#[0-9a-fA-F]{6}/, `$1${to}`);
const iconSvg = retint(readFileSync(R("public", "icon.svg"), "utf8"));
const traySvg = readFileSync(R("public", "tray.svg"), "utf8");
const trayBlack = traySvg.replace(/fill="white"/g, 'fill="black"');

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();

const out = async (file, svg, size) => {
  mkdirSync(dirname(file), { recursive: true });
  await png(svg, size).toFile(file);
  console.log(`${file.replace(R("..") + "/", "")}  ${size}px`);
};

// panel: favicon SVG (Next lo sirve desde app/icon.svg) y apple-icon
writeFileSync(R("app", "icon.svg"), iconSvg);
console.log("dashboard/app/icon.svg");
await out(R("app", "apple-icon.png"), iconSvg, 180);

// agente: icono de app (electron-builder deriva .icns/.ico), ventana y tray
await out(AGENT("build", "icon.png"), iconSvg, 512);
await out(AGENT("assets", "icon.png"), iconSvg, 256);
await out(AGENT("assets", "logo.png"), iconSvg, 128);
await out(AGENT("assets", "tray.png"), iconSvg, 16);
await out(AGENT("assets", "tray@2x.png"), iconSvg, 32);
await out(AGENT("assets", "trayTemplate.png"), trayBlack, 16);
await out(AGENT("assets", "trayTemplate@2x.png"), trayBlack, 32);
copyFileSync(R("public", "vela.svg"), AGENT("assets", "vela.svg"));

// 3 · css de la ventana del agente
writeFileSync(
  AGENT("assets", "brand.css"),
  `/* generado por dashboard/scripts/brand.mjs desde theme/_seed.ts — no editar */
:root {
  --brand-from: ${from};
  --brand-to: ${to};
  --brand-angle: ${brand.angle}deg;
  --primary-400: ${SEED.primary["400"]};
  --primary-600: ${SEED.primary["600"]};
  --accent-500: ${SEED.accent["500"]};
  --surface: ${colors.dark.surface};
  --raised: ${colors.dark.raised};
  --text: ${colors.dark.text};
  --muted: ${colors.dark.muted};
}
`
);
console.log("agent/assets/brand.css");
