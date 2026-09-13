"use client";

import { Button, EmptyModule, SimpleGrid } from "@stellaria/nebula-web";

import { useMonitorContext } from "../lib/monitor-context";
import { Icon } from "../theme/icons";
import { EquipoCard, type EquipoCardLabels } from "./equipo-card";
import { GridSkeleton } from "./grid-skeleton";

export interface EquiposGridLabels {
  card: EquipoCardLabels;
  empty: { title: string; description: string };
  error: { title: string; description: string; action: string };
  blocked: { title: string; description: string };
  connecting: { title: string; description: string };
}

/** Las cinco columnas van declaradas: las vars de `SimpleGrid` se heredan en rejillas anidadas. */
export const EQUIPOS_COLS = { base: 1, phone: 1, tablet: 2, laptop: 3, desktop: 3, wide: 4 };

/**
 * La rejilla de equipos y sus estados (docs/07 §9): conectando (esqueleto),
 * sin conexion (error + reintento), token rechazado (bloqueado) y sin equipos
 * (vacio). Un fallo nunca se pinta como vacio.
 */
export function EquiposGrid({ labels }: { labels: EquiposGridLabels }) {
  const { status, agents, streams, stats, retry } = useMonitorContext();

  if (status === "connecting" && agents.length === 0) return <GridSkeleton />;

  if (status === "offline") {
    return (
      <EmptyModule
        layout="side"
        surface="glass"
        fill
        icon={<Icon name="activity" size={40} />}
        title={labels.error.title}
        description={labels.error.description}
        action={
          <Button variant="gradient" onClick={retry}>
            {labels.error.action}
          </Button>
        }
      />
    );
  }

  if (status === "unauthorized") {
    return (
      <EmptyModule
        layout="side"
        surface="glass"
        fill
        icon={<Icon name="lock" size={40} />}
        title={labels.blocked.title}
        description={labels.blocked.description}
      />
    );
  }

  if (agents.length === 0) {
    return (
      <EmptyModule
        layout="side"
        surface="glass"
        fill
        icon={<Icon name="monitor" size={40} />}
        title={labels.empty.title}
        description={labels.empty.description}
      />
    );
  }

  return (
    <SimpleGrid cols={EQUIPOS_COLS} gap="md">
      {agents.map((a, index) => (
        <EquipoCard
          key={a.id}
          id={a.id}
          name={a.name}
          stream={streams[a.id]}
          stats={stats[a.id]}
          labels={labels.card}
          reveal={{ index }}
        />
      ))}
    </SimpleGrid>
  );
}
