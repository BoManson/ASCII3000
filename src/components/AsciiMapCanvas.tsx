import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, Crosshair } from 'lucide-react';
import { STAGE_COLORS, TILE_COLORS } from '../game/constants';
import { getTileAscii, isZoneType } from '../game/simulation';
import type { CityState, ToolId } from '../game/types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
  color: string;
}

interface AsciiMapCanvasProps {
  city: CityState;
  activeTool: ToolId;
  inspectedCoords: { x: number; y: number } | null;
  interactive: boolean;
  onPaintTile: (x: number, y: number) => boolean;
  onInspectTile: (x: number, y: number) => void;
}

const BASE_CELL_SIZE = 26;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2.4;
const PARTICLE_POOL_SIZE = 48;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const AsciiMapCanvas: React.FC<AsciiMapCanvasProps> = ({
  city,
  activeTool,
  inspectedCoords,
  interactive,
  onPaintTile,
  onInspectTile,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cityRef = useRef(city);
  cityRef.current = city;

  const toolRef = useRef(activeTool);
  toolRef.current = activeTool;

  const inspectedRef = useRef(inspectedCoords);
  inspectedRef.current = inspectedCoords;

  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  const callbacksRef = useRef({ onPaintTile, onInspectTile });
  callbacksRef.current = { onPaintTile, onInspectTile };

  // Camera state stored in ref for 60fps smooth pan/pinch without React reconciliation
  const cameraRef = useRef({
    offsetX: 0,
    offsetY: 0,
    zoom: 1.05,
    initialized: false,
    width: 390,
    height: 520,
  });

  const [zoomPercent, setZoomPercent] = useState(105);

  const hoverTileRef = useRef<{ x: number; y: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: 'none' | 'paint' | 'pan' | 'pinch';
    lastTile: { x: number; y: number } | null;
    lastPanX: number;
    lastPanY: number;
    pinchStartDist: number;
    pinchStartZoom: number;
    pinchMidX: number;
    pinchMidY: number;
  }>({
    mode: 'none',
    lastTile: null,
    lastPanX: 0,
    lastPanY: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1,
    pinchMidX: 0,
    pinchMidY: 0,
  });

  // Zero-GC pooled particle ring buffer
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.35,
      char: '*',
      color: '#4ade80',
    }))
  );
  const particleCursorRef = useRef(0);

  const spawnTileParticles = (tileX: number, tileY: number, tool: ToolId) => {
    const pool = particlesRef.current;
    const count = tool === 'bulldoze' ? 7 : 4;
    const color =
      tool === 'bulldoze'
        ? '#f87171'
        : tool === 'power_plant' || tool === 'power_line'
        ? '#fde047'
        : tool === 'residential'
        ? '#4ade80'
        : tool === 'commercial'
        ? '#60a5fa'
        : tool === 'industrial'
        ? '#fb923c'
        : tool === 'park'
        ? '#34d399'
        : '#cbd5e1';

    const chars = tool === 'bulldoze' ? ['x', '*', '.'] : ['+', '.', '*'];

    for (let i = 0; i < count; i++) {
      const idx = particleCursorRef.current % PARTICLE_POOL_SIZE;
      particleCursorRef.current++;
      const p = pool[idx];
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.7;
      const speed = 1.6 + Math.random() * 2.4;
      p.active = true;
      p.x = tileX + 0.5;
      p.y = tileY + 0.5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 0.24 + Math.random() * 0.16;
      p.char = chars[i % chars.length];
      p.color = color;
    }
  };

  const clampCamera = () => {
    const cam = cameraRef.current;
    const c = cityRef.current;
    const cell = BASE_CELL_SIZE * cam.zoom;
    const mapW = c.width * cell;
    const mapH = c.height * cell;
    const margin = Math.min(cam.width, cam.height) * 0.35;

    const minX = cam.width - mapW - margin;
    const maxX = margin;
    const minY = cam.height - mapH - margin;
    const maxY = margin;

    if (minX > maxX) {
      cam.offsetX = (cam.width - mapW) / 2;
    } else {
      cam.offsetX = clamp(cam.offsetX, minX, maxX);
    }

    if (minY > maxY) {
      cam.offsetY = (cam.height - mapH) / 2;
    } else {
      cam.offsetY = clamp(cam.offsetY, minY, maxY);
    }
  };

  const centerCamera = (targetZoom?: number) => {
    const cam = cameraRef.current;
    const c = cityRef.current;
    const zoom = targetZoom ?? (cam.width < 430 ? 1.05 : 1.15);
    cam.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const cell = BASE_CELL_SIZE * cam.zoom;
    cam.offsetX = (cam.width - c.width * cell) / 2;
    cam.offsetY = (cam.height - c.height * cell) / 2;
    cam.initialized = true;
    setZoomPercent(Math.round(cam.zoom * 100));
  };

  const zoomAroundPoint = (newZoom: number, pivotX: number, pivotY: number) => {
    const cam = cameraRef.current;
    const clampedZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const oldCell = BASE_CELL_SIZE * cam.zoom;
    const newCell = BASE_CELL_SIZE * clampedZoom;

    const worldX = (pivotX - cam.offsetX) / oldCell;
    const worldY = (pivotY - cam.offsetY) / oldCell;

    cam.zoom = clampedZoom;
    cam.offsetX = pivotX - worldX * newCell;
    cam.offsetY = pivotY - worldY * newCell;
    clampCamera();
    setZoomPercent(Math.round(cam.zoom * 100));
  };

  const screenToTile = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const cam = cameraRef.current;
    const cell = BASE_CELL_SIZE * cam.zoom;
    const tx = Math.floor((localX - cam.offsetX) / cell);
    const ty = Math.floor((localY - cam.offsetY) / cell);
    const c = cityRef.current;
    if (tx < 0 || ty < 0 || tx >= c.width || ty >= c.height) return null;
    return { x: tx, y: ty };
  };

  const paintLine = (x0: number, y0: number, x1: number, y1: number) => {
    const tool = toolRef.current;
    let cx = x0;
    let cy = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      const changed = callbacksRef.current.onPaintTile(cx, cy);
      if (changed) {
        spawnTileParticles(cx, cy, tool);
      }
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  };

  // ResizeObserver & Main Canvas2D Render Loop (mounted once)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(100, Math.floor(rect.width));
      const h = Math.max(100, Math.floor(rect.height));

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cam = cameraRef.current;
      const prevW = cam.width;
      const prevH = cam.height;
      cam.width = w;
      cam.height = h;

      if (!cam.initialized) {
        centerCamera(w < 430 ? 1.05 : 1.15);
      } else {
        cam.offsetX += (w - prevW) / 2;
        cam.offsetY += (h - prevH) / 2;
        clampCamera();
      }
    };

    updateCanvasSize();
    const ro = new ResizeObserver(updateCanvasSize);
    ro.observe(container);

    // Keyboard pan & zoom
    const onKeyDown = (e: KeyboardEvent) => {
      if (!interactiveRef.current) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const cam = cameraRef.current;
      const step = 36;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        cam.offsetY += step;
        clampCamera();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        cam.offsetY -= step;
        clampCamera();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        cam.offsetX += step;
        clampCamera();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        cam.offsetX -= step;
        clampCamera();
      } else if (e.key === '=' || e.key === '+') {
        zoomAroundPoint(cam.zoom + 0.15, cam.width / 2, cam.height / 2);
      } else if (e.key === '-' || e.key === '_') {
        zoomAroundPoint(cam.zoom - 0.15, cam.width / 2, cam.height / 2);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Clear pointers on blur so drags never stick
    const clearGestures = () => {
      pointersRef.current.clear();
      gestureRef.current.mode = 'none';
      gestureRef.current.lastTile = null;
    };
    window.addEventListener('blur', clearGestures);

    let rafId = 0;
    let lastTime = performance.now();

    const drawFrame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const cam = cameraRef.current;
      const c = cityRef.current;
      const cell = BASE_CELL_SIZE * cam.zoom;

      // Clear background
      ctx.fillStyle = '#080b0f';
      ctx.fillRect(0, 0, cam.width, cam.height);

      const mapW = c.width * cell;
      const mapH = c.height * cell;

      // Map outer terminal plate
      ctx.fillStyle = '#0b0f15';
      ctx.fillRect(cam.offsetX, cam.offsetY, mapW, mapH);

      // Visible tile bounds
      const startX = Math.max(0, Math.floor(-cam.offsetX / cell));
      const endX = Math.min(c.width - 1, Math.ceil((cam.width - cam.offsetX) / cell));
      const startY = Math.max(0, Math.floor(-cam.offsetY / cell));
      const endY = Math.min(c.height - 1, Math.ceil((cam.height - cam.offsetY) / cell));

      // Subtle phosphor grid lines
      ctx.strokeStyle = '#141b25';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x <= endX + 1; x++) {
        const px = Math.round(cam.offsetX + x * cell) + 0.5;
        ctx.moveTo(px, Math.max(0, cam.offsetY));
        ctx.lineTo(px, Math.min(cam.height, cam.offsetY + mapH));
      }
      for (let y = startY; y <= endY + 1; y++) {
        const py = Math.round(cam.offsetY + y * cell) + 0.5;
        ctx.moveTo(Math.max(0, cam.offsetX), py);
        ctx.lineTo(Math.min(cam.width, cam.offsetX + mapW), py);
      }
      ctx.stroke();

      // Smooth pulsing phase for unpowered '!' warning (always legible, subtly flashing)
      const pulseWave = 0.5 + 0.5 * Math.sin(now * 0.0065);
      const unpoweredAlertAlpha = 0.42 + pulseWave * 0.58;
      const blinkOn = pulseWave > 0.45;
      const powerPulse = 0.72 + Math.sin(now * 0.005) * 0.28;

      const fontSize = Math.max(10, Math.round(cell * 0.66));
      const badgeFontSize = Math.max(9, Math.round(cell * 0.42));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let y = startY; y <= endY; y++) {
        const row = c.grid[y];
        for (let x = startX; x <= endX; x++) {
          const tile = row[x];
          const px = cam.offsetX + x * cell;
          const py = cam.offsetY + y * cell;

          // Subtle tile floor tinting for instant visual grouping
          if (tile.type === 'road') {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
            ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
          } else if (tile.type === 'power_plant') {
            ctx.fillStyle = `rgba(250, 204, 21, ${(0.12 * powerPulse).toFixed(3)})`;
            ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
          } else if (tile.type === 'park') {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.09)';
            ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
          } else if (isZoneType(tile.type)) {
            if (!tile.powered) {
              ctx.fillStyle = `rgba(239, 68, 68, ${(0.06 + pulseWave * 0.12).toFixed(3)})`;
              ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
            } else if (tile.type === 'residential') {
              ctx.fillStyle = `rgba(74, 222, 128, ${0.04 + tile.stage * 0.03})`;
              ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
            } else if (tile.type === 'commercial') {
              ctx.fillStyle = `rgba(96, 165, 250, ${0.04 + tile.stage * 0.03})`;
              ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
            } else if (tile.type === 'industrial') {
              ctx.fillStyle = `rgba(251, 146, 60, ${0.04 + tile.stage * 0.03})`;
              ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
            }
          }

          // ASCII symbol & color
          const ch = getTileAscii(c.grid, x, y);
          let fill = TILE_COLORS[tile.type];
          if (isZoneType(tile.type)) {
            fill = STAGE_COLORS[tile.type][tile.stage];
            if (!tile.powered && blinkOn) {
              fill = '#fca5a5';
            }
          } else if (tile.type === 'power_line') {
            fill = tile.powered ? '#fde047' : '#856b17';
          }

          const weight =
            tile.type === 'empty'
              ? 400
              : tile.type === 'power_plant' || (isZoneType(tile.type) && tile.stage >= 2)
              ? 700
              : 600;

          ctx.font = `${weight} ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;

          // Restrained phosphor highlight on high-energy tiles only
          if (tile.type === 'power_plant' || (isZoneType(tile.type) && tile.stage === 3 && tile.powered)) {
            ctx.shadowColor = fill;
            ctx.shadowBlur = 7;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = fill;
          ctx.fillText(ch, px + cell / 2, py + cell / 2 + 0.5);
          ctx.shadowBlur = 0;

          // Subtle flashing '!' indicator on unpowered zones
          if (isZoneType(tile.type) && !tile.powered) {
            ctx.save();
            ctx.globalAlpha = unpoweredAlertAlpha;
            ctx.font = `700 ${badgeFontSize}px "JetBrains Mono", ui-monospace, monospace`;
            ctx.fillStyle = '#f87171';
            ctx.fillText('!', px + cell - badgeFontSize * 0.45, py + badgeFontSize * 0.58);
            ctx.restore();
          }
        }
      }

      // Outer border of the city grid
      ctx.strokeStyle = '#243040';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.round(cam.offsetX) + 0.5,
        Math.round(cam.offsetY) + 0.5,
        Math.round(mapW),
        Math.round(mapH)
      );

      // Hover highlight reticle
      const hover = hoverTileRef.current;
      if (hover && interactiveRef.current && toolRef.current !== 'pan') {
        const hx = cam.offsetX + hover.x * cell;
        const hy = cam.offsetY + hover.y * cell;
        ctx.strokeStyle =
          toolRef.current === 'bulldoze'
            ? 'rgba(248, 113, 113, 0.85)'
            : toolRef.current === 'inspect'
            ? 'rgba(56, 189, 248, 0.85)'
            : 'rgba(226, 232, 240, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx + 1.5, hy + 1.5, cell - 3, cell - 3);
      }

      // Selected inspected tile corner brackets
      const insp = inspectedRef.current;
      if (insp) {
        const ix = cam.offsetX + insp.x * cell;
        const iy = cam.offsetY + insp.y * cell;
        const b = Math.max(4, cell * 0.26);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(ix + 1, iy + b);
        ctx.lineTo(ix + 1, iy + 1);
        ctx.lineTo(ix + b, iy + 1);
        // Top-right
        ctx.moveTo(ix + cell - b, iy + 1);
        ctx.lineTo(ix + cell - 1, iy + 1);
        ctx.lineTo(ix + cell - 1, iy + b);
        // Bottom-left
        ctx.moveTo(ix + 1, iy + cell - b);
        ctx.lineTo(ix + 1, iy + cell - 1);
        ctx.lineTo(ix + b, iy + cell - 1);
        // Bottom-right
        ctx.moveTo(ix + cell - b, iy + cell - 1);
        ctx.lineTo(ix + cell - 1, iy + cell - 1);
        ctx.lineTo(ix + cell - 1, iy + cell - b);
        ctx.stroke();
      }

      // Pooled placement / bulldoze ASCII spark particles
      const pool = particlesRef.current;
      ctx.font = `700 ${Math.max(9, Math.round(cell * 0.42))}px "JetBrains Mono", monospace`;
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillText(p.char, cam.offsetX + p.x * cell, cam.offsetY + p.y * cell);
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', clearGestures);
    };
  }, []);

  // Pointer & Multi-Touch Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch / pan gesture
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const rect = canvas.getBoundingClientRect();
      gestureRef.current = {
        mode: 'pinch',
        lastTile: null,
        lastPanX: (pts[0].x + pts[1].x) / 2,
        lastPanY: (pts[0].y + pts[1].y) / 2,
        pinchStartDist: Math.max(10, dist),
        pinchStartZoom: cameraRef.current.zoom,
        pinchMidX: (pts[0].x + pts[1].x) / 2 - rect.left,
        pinchMidY: (pts[0].y + pts[1].y) / 2 - rect.top,
      };
      return;
    }

    if (pointersRef.current.size > 2) return;

    const isPanGesture = activeTool === 'pan' || e.button === 1 || e.button === 2 || e.shiftKey;
    if (isPanGesture) {
      gestureRef.current.mode = 'pan';
      gestureRef.current.lastPanX = e.clientX;
      gestureRef.current.lastPanY = e.clientY;
      return;
    }

    const tile = screenToTile(e.clientX, e.clientY);
    if (!tile) {
      gestureRef.current.mode = 'pan';
      gestureRef.current.lastPanX = e.clientX;
      gestureRef.current.lastPanY = e.clientY;
      return;
    }

    if (activeTool === 'inspect') {
      gestureRef.current.mode = 'none';
      onInspectTile(tile.x, tile.y);
      return;
    }

    gestureRef.current.mode = 'paint';
    gestureRef.current.lastTile = tile;
    const changed = onPaintTile(tile.x, tile.y);
    if (changed) {
      spawnTileParticles(tile.x, tile.y, activeTool);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tile = screenToTile(e.clientX, e.clientY);
    hoverTileRef.current = tile;

    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const g = gestureRef.current;
    if (g.mode === 'pinch' && pointersRef.current.size >= 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midScreenX = (pts[0].x + pts[1].x) / 2;
      const midScreenY = (pts[0].y + pts[1].y) / 2;
      const rect = canvas.getBoundingClientRect();

      // Pan delta
      cameraRef.current.offsetX += midScreenX - g.lastPanX;
      cameraRef.current.offsetY += midScreenY - g.lastPanY;
      g.lastPanX = midScreenX;
      g.lastPanY = midScreenY;

      // Zoom around pinch center
      const scaleRatio = dist / g.pinchStartDist;
      zoomAroundPoint(
        g.pinchStartZoom * scaleRatio,
        midScreenX - rect.left,
        midScreenY - rect.top
      );
      return;
    }

    if (g.mode === 'pan') {
      cameraRef.current.offsetX += e.clientX - g.lastPanX;
      cameraRef.current.offsetY += e.clientY - g.lastPanY;
      g.lastPanX = e.clientX;
      g.lastPanY = e.clientY;
      clampCamera();
      return;
    }

    if (g.mode === 'paint' && tile) {
      if (g.lastTile && (g.lastTile.x !== tile.x || g.lastTile.y !== tile.y)) {
        paintLine(g.lastTile.x, g.lastTile.y, tile.x, tile.y);
        g.lastTile = tile;
      } else if (!g.lastTile) {
        const changed = onPaintTile(tile.x, tile.y);
        if (changed) spawnTileParticles(tile.x, tile.y, activeTool);
        g.lastTile = tile;
      }
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2 && gestureRef.current.mode === 'pinch') {
      gestureRef.current.mode = 'none';
    }
    if (pointersRef.current.size === 0) {
      gestureRef.current.mode = 'none';
      gestureRef.current.lastTile = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomAroundPoint(
      cameraRef.current.zoom * factor,
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  };

  const cursorClass =
    activeTool === 'pan'
      ? 'cursor-grab active:cursor-grabbing'
      : activeTool === 'inspect'
      ? 'cursor-help'
      : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#080b0f] touch-none"
    >
      <canvas
        ref={canvasRef}
        data-testid="ascii-map-canvas"
        data-grid-width={city.width}
        data-grid-height={city.height}
        data-population={city.stats.population}
        data-tick={city.tickCount}
        data-zoom={zoomPercent}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onPointerLeave={() => {
          hoverTileRef.current = null;
        }}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`block w-full h-full touch-none ${cursorClass}`}
      />

      {/* Subtle CRT phosphor scanline sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 phosphor-scanlines opacity-55"
      />

      {/* Floating Compact Zoom & Recenter Controls */}
      {interactive && (
        <div
          className="absolute right-2.5 top-2.5 flex flex-col gap-1 z-10"
          role="group"
          aria-label="Map zoom controls"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Zoom in"
            onClick={(e) => {
              e.currentTarget.blur();
              zoomAroundPoint(
                cameraRef.current.zoom + 0.2,
                cameraRef.current.width / 2,
                cameraRef.current.height / 2
              );
            }}
            className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111720] border border-[#243040] text-[#cbd5e1] hover:text-white hover:border-[#3b4d66] active:bg-[#1a2230] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Reset zoom (${zoomPercent}%)`}
            onClick={(e) => {
              e.currentTarget.blur();
              centerCamera(cameraRef.current.width < 430 ? 1.05 : 1.15);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111720] border border-[#243040] text-[#94a3b8] hover:text-white hover:border-[#3b4d66] active:bg-[#1a2230] transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Zoom out"
            onClick={(e) => {
              e.currentTarget.blur();
              zoomAroundPoint(
                cameraRef.current.zoom - 0.2,
                cameraRef.current.width / 2,
                cameraRef.current.height / 2
              );
            }}
            className="flex items-center justify-center w-10 h-10 rounded-md bg-[#111720] border border-[#243040] text-[#cbd5e1] hover:text-white hover:border-[#3b4d66] active:bg-[#1a2230] transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
