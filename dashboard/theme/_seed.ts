import { BuildProduct, type ThemeSeed } from "@stellaria/nebula-themes";
import {
  palettes,
  type ColorScheme,
  type NebulaTheme,
} from "@stellaria/nebula-tokens";

export const SEED = {
  name: "vela",
  primary: palettes.pink,
  accent: palettes.violet,
  from: palettes.pink["300"],
  to: palettes.violet["600"],
  tint: palettes.pink["600"],
  wash: 0.009,
  lift: { base: -14, sunken: -8, raised: -6, overlay: -8 },
  glass: "sheer",
  inkFloor: 1,
  angle: 100,
} satisfies ThemeSeed;

export function Vela(scheme: ColorScheme): NebulaTheme {
  return BuildProduct(SEED, scheme);
}
