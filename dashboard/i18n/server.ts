import "server-only";

import { cookies } from "next/headers";

import { en } from "./dictionaries/en";
import { es, type Dictionary } from "./dictionaries/es";
import { DEFAULT_LOCALE, IsLocale, LOCALE_COOKIE, type Locale } from "./locale";

const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

// Leer la cookie saca la ruta de prerenderizado: en un panel es lo esperado
// (docs/07 §2), y lo hace una vez por peticion.
export async function GetLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return IsLocale(value) ? value : DEFAULT_LOCALE;
}

export async function GetDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await GetLocale();
  return { locale, t: DICTIONARIES[locale] };
}
