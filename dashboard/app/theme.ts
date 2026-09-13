// Tema propio de Stellaria, construido desde una semilla (ver N1 §Fase 1).
// Dos semillas, una por esquema: en claro el `lift` va a 0 para no saturar
// el lienzo blanco.
import {
  BuildProduct,
  type ThemeSeed,
  type SeedName,
} from "@stellaria/nebula-themes";
import { palettes } from "@stellaria/nebula-tokens";
import { CompileThemes } from "@stellaria/nebula-themes/web";

const SEED = {
  name: "stellaria" as SeedName, // cast obligatorio: SeedName es la union cerrada de los 16
  primary: palettes.indigo,
  accent: palettes.cyan,
  from: palettes.indigo["500"],
  to: palettes.cyan["400"],
  tint: palettes.indigo["900"],
  wash: 0.009,
  lift: -12,
  inkFloor: 2,
  angle: 100,
} satisfies ThemeSeed;

export const dark = BuildProduct(SEED, "dark");
export const light = BuildProduct({ ...SEED, lift: 0 }, "light");

const COMPILED = CompileThemes({ stellaria: { dark, light } });

export const CLASSES = COMPILED.classes;
export const CSS = COMPILED.css;
export const THEME_NAME = "stellaria" as const;

export const THEMES = {
  stellaria: {
    dark: { theme: dark, className: CLASSES.stellaria.dark },
    light: { theme: light, className: CLASSES.stellaria.light },
  },
};
