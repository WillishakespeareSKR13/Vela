"use client";

import { useState } from "react";

import { Badge, Flex, Segment, Text } from "@stellaria/nebula-web";

import { useMonitorContext } from "../lib/monitor-context";
import type { Quality } from "../lib/useMonitor";
import { Fill } from "../i18n/locale";

const QUALITIES: Quality[] = ["alta", "media", "baja"];

/** Subtitulo de la pantalla: cuantos equipos hay y el estado del canal. */
export function OnlineSubtitle({
  labels,
}: {
  labels: {
    many: string;
    one: string;
    none: string;
    status: {
      online: string;
      offline: string;
      unauthorized: string;
      connecting: string;
    };
  };
}) {
  const { status, agents } = useMonitorContext();
  const n = agents.length;
  const count =
    n === 0 ? labels.none : n === 1 ? labels.one : Fill(labels.many, { n });
  const color =
    status === "online"
      ? "success"
      : status === "connecting"
        ? "gray"
        : "error";
  return (
    <Flex align="center" gap="md" component="span">
      <Text fz="body2">{count}</Text>
      <Badge size="xs" variant="light" dot color={color}>
        {labels.status[status]}
      </Badge>
    </Flex>
  );
}

/** Preset de calidad para todos los equipos: es una eleccion excluyente, luego `Segment` (docs/07 §12). */
export function QualitySegment({
  labels,
}: {
  labels: { label: string; alta: string; media: string; baja: string };
}) {
  const { setQualityAll } = useMonitorContext();
  const [quality, setQuality] = useState<Quality>("alta");
  return (
    <Segment
      size="sm"
      variant="light"
      value={quality}
      onChange={(value) => {
        setQuality(value as Quality);
        setQualityAll(value as Quality);
      }}
    >
      <Segment.Control
        aria-label={labels.label}
        data={QUALITIES.map((q) => ({ value: q, label: labels[q] }))}
      />
    </Segment>
  );
}
