"use client";

import Link from "next/link";
import { useCallback } from "react";

import {
  AspectRatio,
  Badge,
  Button,
  Card,
  EmptyModule,
  Flex,
  SimpleGrid,
  Skeleton,
  Text,
  Title,
} from "@stellaria/nebula-web";

import { Fill } from "../../../i18n/locale";
import { useMonitorContext } from "../../../lib/monitor-context";
import type { InputEvent } from "../../../lib/useMonitor";
import { Icon } from "../../../theme/icons";
import { EquipoCard, type EquipoCardLabels } from "../../equipo-card";
import { FormatStats } from "../../stats";
import { VideoSurface } from "../../video-surface";
import { useControl } from "./control-context";

export interface EquipoLabels {
  back: string;
  take: string;
  release: string;
  controlHint: string;
  controlPressed: string;
  controlled: string;
  others: string;
  notFound: { title: string; description: string; action: string };
  card: EquipoCardLabels;
}

const OTHERS_COLS = { base: 1, phone: 2, tablet: 3, laptop: 4, desktop: 6, wide: 6 };

export function EquipoTitle({ id, fallback }: { id: string; fallback: string }) {
  const { agents } = useMonitorContext();
  return <>{agents.find((a) => a.id === id)?.name ?? fallback}</>;
}

export function EquipoSubtitle({ id, labels }: { id: string; labels: EquipoLabels }) {
  const { stats } = useMonitorContext();
  const { controlling } = useControl();
  const s = stats[id];
  return (
    <Flex align="center" gap="xs" component="span">
      {controlling && (
        <Badge size="xs" variant="filled" color="error" dot>
          {labels.controlled}
        </Badge>
      )}
      {s && (
        <Text component="span" ff="mono" fz="body3" c="text.muted">
          {FormatStats(s, labels.card.stats)}
        </Text>
      )}
    </Flex>
  );
}

export function EquipoActions({ id, labels }: { id: string; labels: EquipoLabels }) {
  const { agents } = useMonitorContext();
  const { controlling, setControlling } = useControl();
  const present = agents.some((a) => a.id === id);
  return (
    <Flex gap="sm" align="center">
      <Button
        component={Link}
        href="/"
        variant="ghost"
        size="sm"
        leftSection={<Icon name="arrow-left" size={16} />}
      >
        {labels.back}
      </Button>
      {present && (
        <Button
          size="sm"
          variant={controlling ? "filled" : "gradient"}
          color={controlling ? "error" : undefined}
          aria-pressed={controlling}
          leftSection={<Icon name="keyboard" size={16} />}
          onClick={() => setControlling(!controlling)}
        >
          {controlling ? labels.release : labels.take}
        </Button>
      )}
    </Flex>
  );
}

export function EquipoBody({ id, labels }: { id: string; labels: EquipoLabels }) {
  const { status, agents, streams, stats, sendInput } = useMonitorContext();
  const { controlling, setControlling } = useControl();
  const agent = agents.find((a) => a.id === id);
  const onInput = useCallback((ev: InputEvent) => sendInput(id, ev), [id, sendInput]);

  if (!agent) {
    if (status === "connecting") return <FocusSkeleton />;
    if (controlling) setControlling(false);
    return (
      <EmptyModule
        layout="side"
        surface="glass"
        fill
        icon={<Icon name="monitor" size={40} />}
        title={labels.notFound.title}
        description={labels.notFound.description}
        action={
          <Button component={Link} href="/" variant="gradient">
            {labels.notFound.action}
          </Button>
        }
      />
    );
  }

  const stream = streams[id];
  const others = agents.filter((a) => a.id !== id);

  return (
    <Flex direction="column" gap="lg">
      <Card
        variant="glass"
        withBorder
        r="xl"
        p="xs"
        gap="xs"
        bdc={controlling ? "error.500" : undefined}
      >
        <AspectRatio ratio={16 / 9} r="lg" overflow="hidden" bg="surface.sunken">
          {stream ? (
            <VideoSurface stream={stream} controlling={controlling} onInput={onInput} />
          ) : (
            <Skeleton h="100%" w="100%" r="lg" />
          )}
        </AspectRatio>
        {controlling && (
          <Text c="text.muted" fz="body2" px="xs" pb="xxs">
            {Fill(labels.controlHint, { name: agent.name })}
          </Text>
        )}
      </Card>

      {others.length > 0 && (
        <Flex direction="column" gap="sm">
          <Title fz="h6" order={2} c="text.muted">
            {labels.others}
          </Title>
          <SimpleGrid cols={OTHERS_COLS} gap="sm">
            {others.map((o) => (
              <EquipoCard
                key={o.id}
                id={o.id}
                name={o.name}
                stream={streams[o.id]}
                stats={stats[o.id]}
                labels={labels.card}
              />
            ))}
          </SimpleGrid>
        </Flex>
      )}
    </Flex>
  );
}

function FocusSkeleton() {
  return (
    <Card variant="glass" withBorder r="xl" p="xs">
      <AspectRatio ratio={16 / 9} r="lg" overflow="hidden" bg="surface.sunken">
        <Skeleton h="100%" w="100%" r="lg" />
      </AspectRatio>
    </Card>
  );
}
