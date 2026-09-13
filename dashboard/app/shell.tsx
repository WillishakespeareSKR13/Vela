"use client";

// El CSS de las islas de cliente se sirve ANTES que el del layout de servidor,
// asi que la declaracion de orden de capas y el reset tienen que entrar por
// aqui, antes de cualquier componente de Nebula: @layer ordena por primera
// declaracion y si `Box` (nebula.util) llega primero, los style props pierden.
import "./base.css";
import "@stellaria/nebula-web/styles.css";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import {
  ActionIcon,
  AppShell,
  Badge,
  Flex,
  FormField,
  Popover,
  Segment,
  Select,
  StarField,
  Text,
  useAppShellScroll,
  useTheme,
} from "@stellaria/nebula-web";

import { SetLocale } from "../i18n/actions";
import { LOCALES, type Locale } from "../i18n/locale";
import { MonitorProvider, useMonitorContext } from "../lib/monitor-context";
import { Icon } from "../theme/icons";
import { Logo } from "./logo";

export interface ShellLabels {
  brand: string;
  descriptor: string;
  skipToContent: string;
  navigation: string;
  complementary: string;
  collapse: string;
  expand: string;
  group: string;
  equipos: string;
  equiposShort: string;
  descargas: string;
  theme: string;
  dark: string;
  light: string;
  language: string;
  languages: Record<Locale, string>;
}

/**
 * El armazon del panel: AppShell en carril (docs/07 §6). Es la unica isla de
 * cliente estructural; lo que cuelga de `children` sigue siendo de servidor.
 */
export function Shell({
  locale,
  serverUrl,
  token,
  labels,
  children,
}: {
  locale: Locale;
  serverUrl: string;
  token: string;
  labels: ShellLabels;
  children: ReactNode;
}) {
  const [mini, setMini] = useState(false);
  const pathname = usePathname();

  return (
    <MonitorProvider serverUrl={serverUrl} token={token}>
      <AppShell
        labels={{
          skipToContent: labels.skipToContent,
          navigation: labels.navigation,
          complementary: labels.complementary,
        }}
        backdrop={<Backdrop />}
        sidebarCollapsed={mini}
        mainProps={{ direction: "column", overflow: "hidden", position: "relative" }}
        sidebar={
          <AppShell.Sidebar
            activeMode="pathname"
            pathname={pathname}
            collapsed={mini}
            onCollapse={setMini}
            collapseLabels={{ collapse: labels.collapse, expand: labels.expand }}
            toggleProps={{ display: { base: "none", laptop: "block" } }}
            aria-label={labels.navigation}
          >
            <AppShell.Sidebar.Header>
              <Flex
                component={Link}
                href="/"
                align="center"
                gap="sm"
                display={{ base: "none", tablet: "flex" }}
                c="text.primary"
                td="none"
              >
                <Logo size={30} />
                <AppShell.Label>
                  <Text fw="semibold" fz="body2" truncate>
                    {labels.brand}
                  </Text>
                  <Text c="text.muted" fz="caption">
                    {labels.descriptor}
                  </Text>
                </AppShell.Label>
              </Flex>
            </AppShell.Sidebar.Header>

            <AppShell.Sidebar.Body>
              <AppShell.Links title={labels.group}>
                <AppShell.Link
                  component={Link}
                  href="/"
                  active={pathname === "/" || pathname.startsWith("/equipos")}
                  label={<AppShell.Label>{labels.equipos}</AppShell.Label>}
                  aria-label={labels.equipos}
                  leftSection={<Icon name="monitor" size={20} />}
                  rightSection={<OnlineCount />}
                />
                <AppShell.Link
                  component={Link}
                  href="/descargas"
                  label={<AppShell.Label>{labels.descargas}</AppShell.Label>}
                  aria-label={labels.descargas}
                  leftSection={<Icon name="download" size={20} />}
                />
              </AppShell.Links>
            </AppShell.Sidebar.Body>

            <AppShell.Sidebar.Footer p={{ base: "xs", laptop: "sm" }}>
              <Preferences locale={locale} labels={labels} />
            </AppShell.Sidebar.Footer>
          </AppShell.Sidebar>
        }
      >
        {children}
      </AppShell>
    </MonitorProvider>
  );
}

// El campo ambiental de pagina (docs/06 §6): el unico efecto dominante, en la
// capa de fondo, densidad `sm`, con parallax contra lo que scrollea en pantalla.
function Backdrop() {
  const { ref } = useAppShellScroll();
  return <StarField aurora density="sm" fixed parallax scroller={ref} />;
}

function OnlineCount() {
  const { agents } = useMonitorContext();
  if (agents.length === 0) return null;
  return (
    <Badge color="accent" size="xs" variant="light" w={22}>
      {agents.length}
    </Badge>
  );
}

// Tema e idioma viven en el pie de la barra, en un popover (docs/07 §6.2): en
// el panel no hay dock flotante.
function Preferences({ locale, labels }: { locale: Locale; labels: ShellLabels }) {
  const { scheme, setTheme } = useTheme();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const changeLocale = (next: string) => {
    startTransition(async () => {
      await SetLocale(next);
      router.refresh();
    });
  };

  return (
    <Popover
      placement="right"
      withArrow
      width={240}
      offset={16}
      padding="md"
      trigger={
        <ActionIcon aria-label={labels.theme + " · " + labels.language} variant="ghost" size="lg">
          <Icon name="settings" size={20} />
        </ActionIcon>
      }
    >
      <Flex direction="column" gap="md">
        <FormField label={labels.theme}>
          <Segment
            size="sm"
            variant="light"
            fullWidth
            value={scheme}
            onChange={(value) => setTheme(value as "dark" | "light")}
          >
            <Segment.Control
              aria-label={labels.theme}
              data={[
                { value: "dark", label: labels.dark },
                { value: "light", label: labels.light },
              ]}
            />
          </Segment>
        </FormField>
        <FormField label={labels.language}>
          <Select
            size="sm"
            value={locale}
            onChange={changeLocale}
            triggerProps={{ "aria-label": labels.language }}
            data={LOCALES.map((l) => ({ value: l, label: labels.languages[l] }))}
          />
        </FormField>
      </Flex>
    </Popover>
  );
}
