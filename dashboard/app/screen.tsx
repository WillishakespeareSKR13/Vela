import type { ReactNode } from "react";

import { AppShell, Flex } from "@stellaria/nebula-web";

/**
 * Toda pantalla del panel (docs/07 §7.1): UNA seccion pegada con la cabecera
 * (h1 unico, h5 semibold / body3 apagado, fijado aqui y en ningun otro sitio)
 * y el cuerpo con relleno sm en movil y lg desde tablet. De servidor: las
 * partes de AppShell son islas, pero lo que reciben sigue siendo de servidor.
 */
export function Screen({
  title,
  subtitle,
  actions,
  label,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <AppShell.Scroll display="flex" direction="column" flex={1}>
      <AppShell.Section position="sticky" top={0} z="sticky" aria-label={label}>
        <Flex data-floating="header" direction="column" gap={0} w="100%">
          <AppShell.Header
            order={1}
            title={title}
            subtitle={subtitle}
            actions={actions}
            titleProps={{ fz: "h5" }}
            subtitleProps={{ fz: "body3", c: "text.muted" }}
          />
        </Flex>
      </AppShell.Section>
      <Flex flex={1} direction="column" p={{ base: "sm", tablet: "lg" }}>
        {children}
      </Flex>
    </AppShell.Scroll>
  );
}
