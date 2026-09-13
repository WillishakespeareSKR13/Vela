import type { ReactNode } from "react";

// Orden de imports segun N1 §Fase 2: fuentes, reset propio, capas de Nebula.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./base.css";
import "@stellaria/nebula-web/styles.css";

import { NebulaProvider, ThemeScript } from "@stellaria/nebula-web";

import { CLASSES, CSS, THEMES, THEME_NAME } from "./theme";

export const metadata = {
  title: "Stellaria — Panel de supervisión",
  description: "Supervisión de estaciones en tiempo real",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* El script pinta la clase y el tema antes de hidratar; el CSS va en la
            misma llamada a proposito para que no haya carrera. */}
        <ThemeScript
          defaultTheme={THEME_NAME}
          defaultScheme="dark"
          themesClasses={CLASSES}
          themesCSS={CSS}
        />
      </head>
      <body>
        <NebulaProvider
          applyTheme="root"
          themes={THEMES}
          defaultTheme={{ theme: THEME_NAME, scheme: "dark" }}
        >
          {children}
        </NebulaProvider>
      </body>
    </html>
  );
}
