import { Flex } from "@stellaria/nebula-web";
import { GetDictionary } from "../i18n/server";
import { EquiposGrid } from "./equipos-grid";
import { OnlineSubtitle, QualitySegment } from "./equipos-header";
import { Screen } from "./screen";

export default async function Page() {
  const { t } = await GetDictionary();
  return (
    <Screen
      label={t.equipos.title}
      title={t.equipos.title}
      actions={
        <Flex gap="md">
          <OnlineSubtitle
            labels={{
              many: t.equipos.subtitle,
              one: t.equipos.subtitleOne,
              none: t.equipos.subtitleNone,
              status: t.status,
            }}
          />
          <QualitySegment labels={t.quality} />
        </Flex>
      }
    >
      <EquiposGrid
        labels={{
          card: {
            open: t.equipos.open,
            online: t.status.online,
            negotiating: t.equipos.negotiating,
            stats: t.stats,
          },
          empty: t.equipos.empty,
          error: t.equipos.error,
          blocked: t.equipos.blocked,
          connecting: t.equipos.connecting,
        }}
      />
    </Screen>
  );
}
