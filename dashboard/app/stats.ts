import type { TileStats } from "../lib/useMonitor";

export interface StatsLabels {
  fps: string;
  kbps: string;
  mbps: string;
}

/** «1280×720 · 30 fps · 1,2 Mbps»: siempre en mono (docs/07 §1.9). */
export function FormatStats(s: TileStats, labels: StatsLabels): string {
  const res = s.width ? `${s.width}×${s.height}` : "—";
  const rate =
    s.kbps >= 1000 ? `${(s.kbps / 1000).toFixed(1)} ${labels.mbps}` : `${s.kbps} ${labels.kbps}`;
  return `${res} · ${s.fps} ${labels.fps} · ${rate}`;
}
