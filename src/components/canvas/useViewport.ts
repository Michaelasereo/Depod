"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Pan and zoom for the canvas (FigJam-style):
 * - Scroll or two-finger drag pans; Ctrl/⌘ + scroll or pinch zooms around the pointer.
 * - Space + drag, the middle mouse button, or the Hand tool drags the canvas.
 * - Zoom runs from 10% to 400%.
 */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function useViewport(world: { width: number; height: number }, handTool: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [panning, setPanning] = useState(false);
  const space = useRef(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    // Matches the Figma frames: a 1440 × 900 window shows the moodboard at 72%.
    const zoom = clamp(Math.min(width / (world.width * 1.39), height / 1250, 1));
    setView({ zoom, x: (width - world.width * zoom) / 2, y: 0 });
  }, [world.width]);

  useEffect(() => {
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setView((v) => {
      const el = ref.current;
      const r = el?.getBoundingClientRect();
      const px = cx ?? (r ? r.width / 2 : 0);
      const py = cy ?? (r ? r.height / 2 : 0);
      const zoom = clamp(v.zoom * factor);
      const k = zoom / v.zoom;
      return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable]");
      if (e.code === "Space" && !typing) {
        space.current = e.type === "keydown";
        if (e.type === "keydown") e.preventDefault();
        setPanning(space.current);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!(handTool || space.current || e.button === 1)) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    setPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
    setPanning(space.current);
  };

  return {
    ref,
    view,
    panning,
    grab: handTool || panning,
    zoomIn: () => zoomAt(1.25),
    zoomOut: () => zoomAt(0.8),
    fit,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
