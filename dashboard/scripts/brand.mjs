// Vuelca los colores de marca que salen de la semilla del tema a
// ../brand/colors.json, para generar el logo y los iconos del agente con los
// MISMOS hex que pinta el panel. Uso: pnpm brand
//
// `nebula-themes` (sin /web) es JS puro y carga en Node; `_seed.ts` es TS, asi
// que se ejecuta con el strip de tipos de Node (>= 22.6).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { SEED, Vela } = await import("../theme/_seed.ts");

const dark = Vela("dark");
const light = Vela("light");
const brand = dark.effects.gradients.brand;

const out = {
  name: SEED.name,
  gradient: {
    angle: brand.angle,
    from: brand.stops[0].color,
    to: brand.stops[brand.stops.length - 1].color,
  },
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

const file = resolve(dirname(fileURLToPath(import.meta.url)), "../../brand/colors.json");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(`brand/colors.json ← ${out.gradient.from} → ${out.gradient.to} (${out.gradient.angle}°)`);
