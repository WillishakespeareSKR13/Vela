import type { ReactNode } from "react";

// Orden de imports (N1 §Fase 2): fuentes, reset propio en su capa, y despues
// las capas de Nebula. `base.css` va ANTES de `styles.css` a proposito: @layer
// ordena por primera declaracion, y `legacy` tiene que quedar DEBAJO. Los dos
// CSS se importan tambien en `shell.tsx` (ver alli por que).
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./base.css";
import "@stellaria/nebula-web/styles.css";

import { NebulaProvider, ThemeScript } from "@stellaria/nebula-web";
import { vars } from "@stellaria/nebula-themes/web";

import { GetDictionary } from "../i18n/server";
import { CLASSES, CSS, THEMES, THEME_NAME, THEME_SCHEME } from "../theme";
import { Shell } from "./shell";

export const metadata = {
  title: "Vela",
  description: "Supervisión de estaciones en tiempo real",
  robots: { index: false, follow: false },
};

// El lienzo del documento se lee del tema en linea (N1 §Fase 2, via sin
// vanilla-extract): cuatro declaraciones que se retinen con el esquema.
const BODY_STYLE = {
  background: vars.color.surface.base,
  color: vars.color.text.primary,
  fontFamily: vars.font.family.sans,
  minHeight: "100dvh",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await GetDictionary();
  const serverUrl = process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:8080";
  // Token compartido con el servidor de senalizacion. Al ser NEXT_PUBLIC_ acaba
  // en el bundle del navegador: protege el acceso al panel aparte (VPN, proxy
  // con login), no lo publiques abierto a internet.
  const token = process.env.NEXT_PUBLIC_SIGNALING_TOKEN ?? "";

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <ThemeScript
          defaultTheme={THEME_NAME}
          defaultScheme={THEME_SCHEME}
          themesClasses={CLASSES}
          themesCSS={CSS}
        />
      </head>
      <body style={BODY_STYLE}>
        <NebulaProvider
          applyTheme="root"
          themes={THEMES}
          defaultTheme={{ theme: THEME_NAME, scheme: THEME_SCHEME }}
        >
          <Shell
            locale={locale}
            serverUrl={serverUrl}
            token={token}
            labels={{
              brand: t.shell.brand,
              descriptor: t.shell.descriptor,
              skipToContent: t.shell.skipToContent,
              navigation: t.shell.navigation,
              complementary: t.shell.complementary,
              collapse: t.shell.collapse,
              expand: t.shell.expand,
              group: t.shell.groups.panel,
              equipos: t.shell.links.equipos,
              equiposShort: t.shell.links.equiposShort,
              descargas: t.shell.links.descargas,
              theme: t.shell.footer.theme,
              dark: t.shell.footer.dark,
              light: t.shell.footer.light,
              language: t.shell.footer.language,
              languages: t.shell.footer.languages,
            }}
          >
            {children}
          </Shell>
        </NebulaProvider>
      </body>
    </html>
  );
}
