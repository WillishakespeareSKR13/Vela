import {
  Badge,
  Button,
  ButtonCopy,
  Card,
  Code,
  EmptyModule,
  Flex,
  SimpleGrid,
  Text,
  Title,
} from "@stellaria/nebula-web";

import { GetDictionary } from "../../i18n/server";
import { Fill } from "../../i18n/locale";
import { FormatSize, GetLatestRelease, type DownloadPlatform } from "../../lib/releases";
import { Icon } from "../../theme/icons";
import { Screen } from "../screen";

const PLATFORMS: DownloadPlatform[] = ["windows", "mac-arm64", "mac-x64"];
const COLS = { base: 1, phone: 1, tablet: 3, laptop: 3, desktop: 3, wide: 3 };
const REPO_URL = `https://github.com/${process.env.VELA_GITHUB_REPO ?? "WillishakespeareSKR13/Vela"}`;

/**
 * Descargas del agente: de servidor, lee el ultimo Release de GitHub. Los
 * enlaces son `component="a"` (docs/07 §1.4: `Link` no cruza la frontera y
 * ademas son ficheros, no rutas). El config.json lleva la URL de senalizacion
 * y el token de este mismo panel, que ya viajan en su bundle.
 */
export default async function Page() {
  const { locale, t } = await GetDictionary();
  const release = await GetLatestRelease();
  const d = t.descargas;

  const server = (process.env.NEXT_PUBLIC_SIGNALING_URL ?? "ws://localhost:8080").replace(/^http/, "ws");
  const config = JSON.stringify(
    { server, token: process.env.NEXT_PUBLIC_SIGNALING_TOKEN ?? "", name: "Recepcion-01", showIndicator: false },
    null,
    2
  );

  const subtitle = release
    ? Fill(d.subtitle, {
        version: release.version,
        date: new Date(release.publishedAt).toLocaleDateString(locale, { dateStyle: "medium" }),
      })
    : d.subtitleNone;

  return (
    <Screen label={d.title} title={d.title} subtitle={subtitle}>
      <Flex direction="column" gap="lg">
        {release ? (
          <SimpleGrid cols={COLS} gap="md">
            {PLATFORMS.map((platform, index) => {
              const asset = release.assets.find((a) => a.platform === platform);
              return (
                <Card key={platform} variant="glass" withBorder r="xl" p="lg" reveal={{ index }}>
                  <Flex direction="column" gap="sm" h="100%">
                    <Flex align="center" gap="sm" c="primary.600">
                      <Icon name="monitor" size={22} />
                      <Title fz="h5" order={3}>
                        {d.platforms[platform].title}
                      </Title>
                    </Flex>
                    <Text c="text.muted" fz="body2">
                      {d.platforms[platform].description}
                    </Text>
                    {asset ? (
                      <Flex direction="column" gap="xs" mt="auto">
                        <Text c="text.muted" ff="mono" fz="caption">
                          {asset.name} · {FormatSize(asset.size)}
                        </Text>
                        <Button
                          component="a"
                          href={asset.url}
                          variant={platform === "windows" ? "gradient" : "glass"}
                          leftSection={<Icon name="download" size={16} />}
                        >
                          {d.download}
                        </Button>
                      </Flex>
                    ) : (
                      <Text c="text.muted" fz="caption" mt="auto">
                        {d.missing}
                      </Text>
                    )}
                  </Flex>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <EmptyModule
            layout="side"
            surface="glass"
            fill
            icon={<Icon name="download" size={40} />}
            title={d.empty.title}
            description={d.empty.description}
            action={
              <Button component="a" href={`${REPO_URL}/releases`} variant="gradient">
                {d.empty.action}
              </Button>
            }
          />
        )}

        <Text c="text.muted" fz="body2">
          {d.macNote}
        </Text>

        <Card variant="glass" withBorder r="xl" p="lg">
          <Flex direction="column" gap="sm">
            <Flex align="center" justify="space-between" gap="sm">
              <Flex align="center" gap="sm">
                <Title fz="h5" order={3}>
                  {d.config.title}
                </Title>
                <Badge size="sm" variant="outline">
                  config.json
                </Badge>
              </Flex>
              <ButtonCopy
                value={config}
                aria-label={d.config.copy}
                copyLabel={d.config.copy}
                copiedLabel={d.config.copied}
                variant="glass"
              />
            </Flex>
            <Text c="text.muted" fz="body2">
              {d.config.description}
            </Text>
            <Code block>{config}</Code>
          </Flex>
        </Card>
      </Flex>
    </Screen>
  );
}
