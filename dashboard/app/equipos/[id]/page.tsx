import { GetDictionary } from "../../../i18n/server";
import { Screen } from "../../screen";
import { ControlProvider } from "./control-context";
import { EquipoActions, EquipoBody, EquipoSubtitle, EquipoTitle } from "./equipo";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await GetDictionary();
  const labels = {
    back: t.equipo.back,
    take: t.equipo.take,
    release: t.equipo.release,
    controlHint: t.equipo.controlHint,
    controlPressed: t.equipo.controlPressed,
    controlled: t.status.controlled,
    others: t.equipo.others,
    notFound: t.equipo.notFound,
    card: {
      open: t.equipos.open,
      online: t.status.online,
      negotiating: t.equipos.negotiating,
      stats: t.stats,
    },
  };
  return (
    <ControlProvider>
      <Screen
        label={t.equipos.title}
        title={<EquipoTitle id={id} fallback={t.equipos.title} />}
        subtitle={<EquipoSubtitle id={id} labels={labels} />}
        actions={<EquipoActions id={id} labels={labels} />}
      >
        <EquipoBody id={id} labels={labels} />
      </Screen>
    </ControlProvider>
  );
}
