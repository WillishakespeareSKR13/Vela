"use client";

import { useEffect, useRef } from "react";

import { Box } from "@stellaria/nebula-web";

import type { InputEvent } from "../lib/useMonitor";

/**
 * El `<video>` de un flujo WebRTC. Hueco del catalogo: `VideoPlayer` recibe
 * `src` (una URL) y aqui hay un `MediaStream`. Sin `controls` a proposito
 * (docs/07 §11). Si `controlling`, captura raton y teclado y los normaliza a
 * [0,1] sobre el contenido real del video (letterboxing de `object-fit`).
 */
export function VideoSurface({
  stream,
  controlling = false,
  onInput,
}: {
  stream?: MediaStream;
  controlling?: boolean;
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
    <Box
      component="video"
      ref={ref}
      autoPlay
      muted
      playsInline
      display="block"
      w="100%"
      h="100%"
      objectFit="contain"
      cursor={controlling ? "crosshair" : undefined}
    />
  );
}
