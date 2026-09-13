export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
// El panel elige idioma por cookie (docs/07 §2): no hay ruta /[lang] en un panel.
export const LOCALE_COOKIE = "vela-lang";

export function IsLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Rellena {marcadores}; en desarrollo avisa si queda alguno sin valor. */
export function Fill(template: string, values: Record<string, string | number>): string {
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  );
  if (process.env.NODE_ENV !== "production" && /\{\w+\}/.test(out)) {
    console.warn(`[i18n] marcador sin rellenar en "${out}"`);
  }
  return out;
}
