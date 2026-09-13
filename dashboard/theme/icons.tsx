// Registro tipado de iconos (docs/07 §1.7): pedir uno que no existe no compila.
// Medido el 2026-09-13: registrar solo los seis que usa el panel ahorra 8,6 kB
// brotli (q5) frente al pack completo; se mantiene la norma y se anota.
import { CreateIcons } from "@stellaria/nebula-icons";
import { AllIconsPack } from "@stellaria/nebula-icons/packs";

export const { Icon, names: ICON_NAMES, has: HasIcon } = CreateIcons({ ...AllIconsPack });
export type IconName = (typeof ICON_NAMES)[number];
