import type { ThemeSchemes } from "@stellaria/nebula-themes";
import {
  CompileThemes,
  type ThemeVariants,
} from "@stellaria/nebula-themes/web";

import { Vela } from "./_seed";

export const light = Vela("light");
export const dark = Vela("dark");

export const THEME_NAME = "vela";
export const THEME_SCHEME = "dark" as "dark" | "light";
export const vela: ThemeSchemes = { dark, light };

const COMPILED = CompileThemes({ [THEME_NAME]: vela });

export const CLASSES = COMPILED.classes;
export const CSS = COMPILED.css;
export const BASE = COMPILED.base;

export const THEMES: Record<string, ThemeVariants> = {
  [THEME_NAME]: {
    dark: { theme: dark, className: CLASSES.vela.dark },
    light: { theme: light, className: CLASSES.vela.light },
  },
};
