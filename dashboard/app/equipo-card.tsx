"use client";

import { useRouter } from "next/navigation";

import {
  AspectRatio,
  Badge,
  Card,
  Flex,
  Skeleton,
  Text,
  Title,
} from "@stellaria/nebula-web";

import type { TileStats } from "../lib/useMonitor";
import { FormatStats, type StatsLabels } from "./stats";
import { VideoSurface } from "./video-surface";

export interface EquipoCardLabels {
  open: string;
  online: string;
  negotiating: string;
  stats: StatsLabels;
}

/**
 * LA tarjeta de equipo, unica para todas las rejillas del panel (docs/07 §10):
 * cristal, borde, r="xl"; el video en 16/9 sobre `surface.sunken`; nombre en
 * h5/order 3; estado y cifras en mono. Hasta que el flujo llega, un esqueleto
 * con la misma geometria. `onPress` y no `href`: `Card` no acepta `component`,
 * y un `<a>` a pelo recargaria la pagina y renegociaria todos los flujos.
 */
export function EquipoCard({
  id,
  name,
  stream,
  stats,
  labels,
  reveal,
}: {
  id: string;
  name: string;
  stream?: MediaStream;
  stats?: TileStats;
  labels: EquipoCardLabels;
  reveal?: { index: number };
}) {
  const router = useRouter();
  return (
    <Card
      variant="glass"
      withBorder
      r="xl"
      p="xs"
      gap="xs"
      onPress={() => router.push(`/equipos/${id}`)}
      aria-label={labels.open.replace("{name}", name)}
      reveal={reveal}
    >
      <AspectRatio ratio={16 / 9} r="lg" overflow="hidden" bg="surface.sunken">
        {stream ? <VideoSurface stream={stream} /> : <Skeleton h="100%" w="100%" r="lg" />}
      </AspectRatio>
      <Flex direction="column" gap="xxs" px="xs" pb="xxs">
        <Flex align="center" gap="xs">
          <Badge
            size="xs"
            variant="light"
            dot
            color={stream ? "success" : "gray"}
            aria-label={stream ? labels.online : labels.negotiating}
          />
          <Title fz="h5" order={3}>
            {name}
          </Title>
        </Flex>
        <Text c="text.muted" ff="mono" fz="caption">
          {stats ? FormatStats(stats, labels.stats) : labels.negotiating}
        </Text>
      </Flex>
    </Card>
  );
}
