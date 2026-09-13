"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Quality = "alta" | "media" | "baja";

export interface AgentInfo {
  id: string;
  name: string;
}

export interface TileStats {
  fps: number;
  kbps: number;
  width: number;
  height: number;
}

export interface InputEvent {
  kind: "input";
  t: "move" | "down" | "up" | "wheel" | "kdown" | "kup";
  x?: number;
  y?: number;
  button?: number;
  dy?: number;
  code?: string;
}

interface Peer {
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
}

const ICE: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 * Gestiona la conexion del visor: una sesion WebRTC por agente, sus flujos de
 * video, las estadisticas de calidad y el canal para enviar entrada y calidad.
 */
export function useMonitor(serverUrl: string) {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [stats, setStats] = useState<Record<string, TileStats>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const subscribedRef = useRef<Set<string>>(new Set());
  const prevRef = useRef<Map<string, { bytes: number; frames: number; ts: number }>>(new Map());
  const qualityRef = useRef<Quality>("alta");

  const send = useCallback((obj: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }, []);

  const subscribe = useCallback(
    (agentId: string) => {
      if (subscribedRef.current.has(agentId)) return;
      subscribedRef.current.add(agentId);
      send({ type: "subscribe", agentId });
    },
    [send]
  );

  const teardown = useCallback((agentId: string) => {
    const p = peersRef.current.get(agentId);
    if (p) {
      p.pc.close();
      peersRef.current.delete(agentId);
    }
    subscribedRef.current.delete(agentId);
    prevRef.current.delete(agentId);
    setStreams((s) => {
      const next = { ...s };
      delete next[agentId];
      return next;
    });
  }, []);

  // Recibe la oferta del agente y responde (el agente es el oferente).
  const onOffer = useCallback(
    async (agentId: string, sdp: string) => {
      const pc = new RTCPeerConnection(ICE);
      const peer: Peer = { pc, channel: null };
      peersRef.current.set(agentId, peer);

      pc.ontrack = (e) => {
        setStreams((s) => ({ ...s, [agentId]: e.streams[0] }));
      };
      pc.ondatachannel = (e) => {
        peer.channel = e.channel;
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: "ice", to: agentId, candidate: e.candidate });
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) teardown(agentId);
      };

      await pc.setRemoteDescription({ type: "offer", sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", to: agentId, sdp: answer.sdp });
    },
    [send, teardown]
  );

  // ---- Ciclo de conexion / reconexion --------------------------------------
  useEffect(() => {
    let closedByUs = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        send({ type: "register", role: "viewer", name: "Dashboard" });
      };
      ws.onclose = () => {
        setConnected(false);
        for (const id of [...peersRef.current.keys()]) teardown(id);
        if (!closedByUs) retry = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "agents":
            setAgents(msg.agents);
            for (const a of msg.agents as AgentInfo[]) subscribe(a.id);
            break;
          case "offer":
            await onOffer(msg.from, msg.sdp);
            break;
          case "ice": {
            const p = peersRef.current.get(msg.from);
            if (p && msg.candidate) {
              try {
                await p.pc.addIceCandidate(msg.candidate);
              } catch {
                /* candidato tardio */
              }
            }
            break;
          }
          case "peer-left":
            teardown(msg.id);
            setAgents((list) => list.filter((a) => a.id !== msg.id));
            break;
        }
      };
    }

    connect();
    return () => {
      closedByUs = true;
      if (retry) clearTimeout(retry);
      for (const id of [...peersRef.current.keys()]) teardown(id);
      wsRef.current?.close();
    };
  }, [serverUrl, send, subscribe, onOffer, teardown]);

  // ---- Bucle de estadisticas (FPS, bitrate, resolucion) --------------------
  useEffect(() => {
    const timer = setInterval(async () => {
      const next: Record<string, TileStats> = {};
      for (const [id, { pc }] of peersRef.current) {
        try {
          const report = await pc.getStats();
          report.forEach((r: any) => {
            if (r.type === "inbound-rtp" && r.kind === "video") {
              const prev = prevRef.current.get(id);
              const now = r.timestamp as number;
              let kbps = 0;
              let fps = r.framesPerSecond ?? 0;
              if (prev && now > prev.ts) {
                const dt = (now - prev.ts) / 1000;
                kbps = Math.round((((r.bytesReceived ?? 0) - prev.bytes) * 8) / 1000 / dt);
                if (!fps) fps = Math.round(((r.framesDecoded ?? 0) - prev.frames) / dt);
              }
              prevRef.current.set(id, {
                bytes: r.bytesReceived ?? 0,
                frames: r.framesDecoded ?? 0,
                ts: now,
              });
              next[id] = {
                fps: Math.round(fps),
                kbps: Math.max(0, kbps),
                width: r.frameWidth ?? 0,
                height: r.frameHeight ?? 0,
              };
            }
          });
        } catch {
          /* pc cerrandose */
        }
      }
      setStats(next);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Acciones del visor --------------------------------------------------
  const sendInput = useCallback((agentId: string, ev: InputEvent) => {
    const ch = peersRef.current.get(agentId)?.channel;
    if (ch && ch.readyState === "open") ch.send(JSON.stringify(ev));
  }, []);

  const setQualityAll = useCallback((q: Quality) => {
    qualityRef.current = q;
    for (const { channel } of peersRef.current.values()) {
      if (channel && channel.readyState === "open") {
        channel.send(JSON.stringify({ kind: "config", quality: q }));
      }
    }
  }, []);

  return { connected, agents, streams, stats, sendInput, setQualityAll };
}
