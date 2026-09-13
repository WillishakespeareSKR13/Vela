"use client";

import { useEffect, useRef, useState } from "react";

import {
  AspectRatio,
  Badge,
  Button,
  Card,
  Group,
  Main,
  SimpleGrid,
  Text,
  Title,
} from "@stellaria/nebula-web";

import { useMonitor, type InputEvent, type Quality } from "../lib/useMonitor";

const QUALITIES: Quality[] = ["alta", "media", "baja"];

export function Dashboard({ serverUrl }: { serverUrl: string }) {
  const { connected, agents, streams, stats, sendInput, setQualityAll } = useMonitor(serverUrl);
  const [focus, setFocus] = useState<string | null>(null);
  const [controlling, setControlling] = useState(false);
  const [quality, setQuality] = useState<Quality>("alta");

  // Si el equipo enfocado se desconecta, se cierra el foco.
  useEffect(() => {
    if (focus && !agents.some((a) => a.id === focus)) {
      setFocus(null);
      setControlling(false);
    }
  }, [agents, focus]);

  const changeQuality = (q: Quality) => {
    setQuality(q);
    setQualityAll(q);
  };

  const header = (
    <Group justify="space-between" align="center" p="md">
      <Group gap="sm" align="center">
        <Title order={3}>Stellaria</Title>
        <Badge color={connected ? "green" : "red"} dot variant="light">
          {connected ? "en línea" : "sin conexión"}
        </Badge>
        <Text size="sm">{agents.length} equipos</Text>
      </Group>
      <Group gap="xs" align="center">
        <Text size="sm">Calidad</Text>
        {QUALITIES.map((q) => (
          <Button
            key={q}
            size="xs"
            variant={quality === q ? "filled" : "light"}
            onClick={() => changeQuality(q)}
          >
            {q}
          </Button>
        ))}
        {focus && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setFocus(null);
              setControlling(false);
            }}
          >
            ← Ver todos
          </Button>
        )}
      </Group>
    </Group>
  );

  return (
    <Main header={header} padded>
      {focus ? (
        <FocusView
          agentId={focus}
          name={agents.find((a) => a.id === focus)?.name ?? focus}
          stream={streams[focus]}
          stats={stats[focus]}
          controlling={controlling}
          onToggleControl={() => setControlling((c) => !c)}
          onInput={(ev) => sendInput(focus, ev)}
          others={agents.filter((a) => a.id !== focus)}
          streamsAll={streams}
          onPick={(id) => {
            setFocus(id);
            setControlling(false);
          }}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md" p="md">
          {agents.map((a) => (
            <Tile
              key={a.id}
              name={a.name}
              stream={streams[a.id]}
              stats={stats[a.id]}
              onClick={() => setFocus(a.id)}
            />
          ))}
          {agents.length === 0 && (
            <Text size="sm">Esperando a que se conecten equipos…</Text>
          )}
        </SimpleGrid>
      )}
    </Main>
  );
}

// ---------------------------------------------------------------------------
// Miniatura de la cuadricula
// ---------------------------------------------------------------------------
function Tile({
  name,
  stream,
  stats,
  onClick,
}: {
  name: string;
  stream?: MediaStream;
  stats?: { fps: number; kbps: number; width: number; height: number };
  onClick: () => void;
}) {
  return (
    <Card variant="outline" p="xs" r="lg" style={{ cursor: "pointer" }} onClick={onClick}>
      <div style={{ position: "relative" }}>
        <AspectRatio ratio={16 / 9} style={{ borderRadius: 10, overflow: "hidden", background: "#000" }}>
          <VideoSurface stream={stream} controlling={false} />
        </AspectRatio>
        <div style={overlayTop}>
          <span style={dot(stream ? "#22c55e" : "#6b7280")} />
          <span style={{ fontWeight: 600 }}>{name}</span>
        </div>
        {stats && <div style={overlayBottom}>{fmtStats(stats)}</div>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Vista enfocada (tipo Meet): un equipo grande + tira de miniaturas
// ---------------------------------------------------------------------------
function FocusView({
  agentId,
  name,
  stream,
  stats,
  controlling,
  onToggleControl,
  onInput,
  others,
  streamsAll,
  onPick,
}: {
  agentId: string;
  name: string;
  stream?: MediaStream;
  stats?: { fps: number; kbps: number; width: number; height: number };
  controlling: boolean;
  onToggleControl: () => void;
  onInput: (ev: InputEvent) => void;
  others: { id: string; name: string }[];
  streamsAll: Record<string, MediaStream>;
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ padding: 16 }}>
      <Card variant="outline" p="sm" r="lg">
        <Group justify="space-between" align="center" mb="sm">
          <Group gap="sm" align="center">
            <span style={dot("#22c55e")} />
            <Text style={{ fontWeight: 700 }}>{name}</Text>
            {stats && <Badge variant="light">{fmtStats(stats)}</Badge>}
          </Group>
          <Button
            size="sm"
            color={controlling ? "red" : "primary"}
            variant={controlling ? "filled" : "light"}
            onClick={onToggleControl}
          >
            {controlling ? "Soltar control" : "Tomar control"}
          </Button>
        </Group>

        <AspectRatio
          ratio={16 / 9}
          style={{
            borderRadius: 12,
            overflow: "hidden",
            background: "#000",
            outline: controlling ? "2px solid #ef4444" : "none",
          }}
        >
          <VideoSurface stream={stream} controlling={controlling} onInput={onInput} />
        </AspectRatio>

        {controlling && (
          <Text size="xs" mt="xs">
            Control activo: el mouse y el teclado se envían a {name}.
          </Text>
        )}
      </Card>

      {others.length > 0 && (
        <SimpleGrid cols={{ base: 3, md: 6, lg: 8 }} spacing="xs" mt="md">
          {others.map((o) => (
            <Card
              key={o.id}
              variant="outline"
              p={0}
              r="md"
              style={{ cursor: "pointer" }}
              onClick={() => onPick(o.id)}
            >
              <AspectRatio ratio={16 / 9} style={{ borderRadius: 8, overflow: "hidden", background: "#000" }}>
                <VideoSurface stream={streamsAll[o.id]} controlling={false} />
              </AspectRatio>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Superficie de video: adjunta el flujo y, si controla, captura entrada
// ---------------------------------------------------------------------------
function VideoSurface({
  stream,
  controlling,
  onInput,
}: {
  stream?: MediaStream;
  controlling: boolean;
  onInput?: (ev: InputEvent) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play?.().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !controlling || !onInput) return;

    // Coordenadas normalizadas [0,1] sobre el contenido real del video,
    // teniendo en cuenta el letterboxing de object-fit: contain.
    const norm = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      const vw = el.videoWidth || r.width;
      const vh = el.videoHeight || r.height;
      const scale = Math.min(r.width / vw, r.height / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const ox = (r.width - dw) / 2;
      const oy = (r.height - dh) / 2;
      const x = Math.min(1, Math.max(0, (cx - r.left - ox) / dw));
      const y = Math.min(1, Math.max(0, (cy - r.top - oy) / dh));
      return { x, y };
    };

    let raf = 0;
    let pending: { x: number; y: number } | null = null;
    const flush = () => {
      raf = 0;
      if (pending) {
        onInput({ kind: "input", t: "move", x: pending.x, y: pending.y });
        pending = null;
      }
    };
    const move = (e: PointerEvent) => {
      pending = norm(e.clientX, e.clientY);
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      onInput({ kind: "input", t: "down", button: e.button });
    };
    const up = (e: PointerEvent) => {
      e.preventDefault();
      onInput({ kind: "input", t: "up", button: e.button });
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      onInput({ kind: "input", t: "wheel", dy: e.deltaY > 0 ? 1 : -1 });
    };
    const ctx = (e: Event) => e.preventDefault();
    const kdown = (e: KeyboardEvent) => {
      e.preventDefault();
      onInput({ kind: "input", t: "kdown", code: e.code });
    };
    const kup = (e: KeyboardEvent) => {
      e.preventDefault();
      onInput({ kind: "input", t: "kup", code: e.code });
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", ctx);
    window.addEventListener("keydown", kdown);
    window.addEventListener("keyup", kup);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", ctx);
      window.removeEventListener("keydown", kdown);
      window.removeEventListener("keyup", kup);
    };
  }, [controlling, onInput]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        cursor: controlling ? "crosshair" : "pointer",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Estilos de superposicion (chrome de app sobre el video)
// ---------------------------------------------------------------------------
const overlayTop: React.CSSProperties = {
  position: "absolute",
  top: 8,
  left: 8,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 8px",
  borderRadius: 6,
  background: "rgba(0,0,0,.55)",
  color: "#fff",
  fontSize: 12,
};

const overlayBottom: React.CSSProperties = {
  position: "absolute",
  bottom: 8,
  left: 8,
  padding: "2px 8px",
  borderRadius: 6,
  background: "rgba(0,0,0,.55)",
  color: "#fff",
  fontSize: 11,
  fontFamily: "var(--font-mono, monospace)",
};

function dot(color: string): React.CSSProperties {
  return { width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" };
}

function fmtStats(s: { fps: number; kbps: number; width: number; height: number }) {
  const res = s.width ? `${s.width}×${s.height}` : "—";
  const rate = s.kbps >= 1000 ? `${(s.kbps / 1000).toFixed(1)} Mbps` : `${s.kbps} kbps`;
  return `${res} · ${s.fps} fps · ${rate}`;
}
