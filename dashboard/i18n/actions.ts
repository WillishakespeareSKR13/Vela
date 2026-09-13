"use server";

import { cookies } from "next/headers";

import { IsLocale, LOCALE_COOKIE } from "./locale";

export async function SetLocale(locale: string): Promise<void> {
  if (!IsLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
