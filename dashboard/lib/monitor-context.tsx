"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useMonitor } from "./useMonitor";

type Monitor = ReturnType<typeof useMonitor>;

const MonitorContext = createContext<Monitor | null>(null);

/**
 * Una sola conexion WebRTC para todo el panel. Vive en el armazon para que
 * navegar entre la rejilla y la ficha de un equipo no renegocie los flujos.
 */
export function MonitorProvider({
  serverUrl,
  token,
  children,
}: {
  serverUrl: string;
  token: string;
  children: ReactNode;
}) {
  const monitor = useMonitor(serverUrl, token);
  return <MonitorContext.Provider value={monitor}>{children}</MonitorContext.Provider>;
}

export function useMonitorContext(): Monitor {
  const value = useContext(MonitorContext);
  if (!value) throw new Error("useMonitorContext fuera de MonitorProvider");
  return value;
}
