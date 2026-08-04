import { collectMinimapMarkers } from "./model";

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const WORLD_SCALE = 150;
const WORLD_WIDTH = MINIMAP_WIDTH * WORLD_SCALE;
const WORLD_HEIGHT = MINIMAP_HEIGHT * WORLD_SCALE;
const TAU = Math.PI * 2;

type CameraSnapshot = {
  panX: number;
  panY: number;
  zoom: number;
};

export type MinimapControllerDeps = {
  canvas?: HTMLCanvasElement | null;
  getDpr: () => number;
  getViewport: () => { width: number; height: number };
  getCamera: () => CameraSnapshot;
  getTick: () => number;
  getRegions: () => any[];
  getIslets: () => any[];
  getTowns: () => any[];
  getLocalPlayerId: () => string | number | null | undefined;
  getTerritoryColor: (region: any, isIslet: boolean) => string;
  panToWorld: (x: number, y: number) => void;
};

export type MinimapController = {
  setCanvas: (canvas: HTMLCanvasElement | null | undefined) => void;
  draw: () => void;
  isDragging: () => boolean;
  destroy: () => void;
};

export function createMinimapController(
  deps: MinimapControllerDeps,
): MinimapController {
  let canvas = deps.canvas || null;
  let context = canvas?.getContext("2d") || null;
  let dragging = false;
  let pointerId: number | null = null;

  const eventPointToWorld = (event: PointerEvent) => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const mapX = ((event.clientX - rect.left) / rect.width) * MINIMAP_WIDTH;
    const mapY = ((event.clientY - rect.top) / rect.height) * MINIMAP_HEIGHT;
    return {
      x: Math.max(0, Math.min(WORLD_WIDTH, mapX * WORLD_SCALE)),
      y: Math.max(0, Math.min(WORLD_HEIGHT, mapY * WORLD_SCALE)),
    };
  };

  const panFromEvent = (event: PointerEvent) => {
    const point = eventPointToWorld(event);
    if (point) deps.panToWorld(point.x, point.y);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || pointerId !== event.pointerId) return;
    event.preventDefault();
    panFromEvent(event);
  };

  const stopDragging = (event?: PointerEvent) => {
    if (event && pointerId !== event.pointerId) return;
    dragging = false;
    pointerId = null;
    if (canvas && event && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!canvas) return;
    event.preventDefault();
    dragging = true;
    pointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    panFromEvent(event);
  };

  const attach = () => {
    canvas?.addEventListener("pointerdown", onPointerDown);
    canvas?.addEventListener("pointermove", onPointerMove);
    canvas?.addEventListener("pointerup", stopDragging);
    canvas?.addEventListener("pointercancel", stopDragging);
    canvas?.addEventListener("lostpointercapture", stopDragging);
  };

  const detach = () => {
    canvas?.removeEventListener("pointerdown", onPointerDown);
    canvas?.removeEventListener("pointermove", onPointerMove);
    canvas?.removeEventListener("pointerup", stopDragging);
    canvas?.removeEventListener("pointercancel", stopDragging);
    canvas?.removeEventListener("lostpointercapture", stopDragging);
    dragging = false;
    pointerId = null;
  };

  attach();

  const resizeCanvas = (dpr: number) => {
    if (!canvas) return;
    const pixelWidth = Math.floor(MINIMAP_WIDTH * dpr);
    const pixelHeight = Math.floor(MINIMAP_HEIGHT * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const oceanGrad = ctx.createRadialGradient(80, 60, 10, 80, 60, 100);
    oceanGrad.addColorStop(0, "#121d28");
    oceanGrad.addColorStop(1, "#0a1118");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.strokeStyle = "rgba(197, 160, 89, 0.05)";
    ctx.lineWidth = 0.5;
    for (let radius = 25; radius <= 100; radius += 25) {
      ctx.beginPath();
      ctx.arc(80, 60, radius, 0, TAU);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(197, 160, 89, 0.035)";
    [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4].forEach((angle) => {
      ctx.beginPath();
      ctx.moveTo(80 - Math.cos(angle) * 120, 60 - Math.sin(angle) * 120);
      ctx.lineTo(80 + Math.cos(angle) * 120, 60 + Math.sin(angle) * 120);
      ctx.stroke();
    });
  };

  const drawRegion = (
    ctx: CanvasRenderingContext2D,
    region: any,
    isIslet: boolean,
  ) => {
    const mx = Number(region.x || 0) / WORLD_SCALE;
    const my = Number(region.y || 0) / WORLD_SCALE;
    const radius = Number(region.r || 100);
    const rx = (Number(region.rx || radius) / WORLD_SCALE) * (isIslet ? 0.82 : 1.02);
    const ry =
      (Number(region.ry || radius * 0.78) / WORLD_SCALE) *
      (isIslet ? 0.82 : 1.02);
    ctx.fillStyle = deps.getTerritoryColor(region, isIslet);
    ctx.beginPath();
    ctx.ellipse(mx, my, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(110, 80, 50, 0.32)";
    ctx.lineWidth = 0.55;
    ctx.stroke();
  };

  const drawTownMarkers = (ctx: CanvasRenderingContext2D) => {
    const tick = deps.getTick();
    collectMinimapMarkers(deps.getTowns(), deps.getLocalPlayerId()).forEach(
      (marker) => {
        const x = marker.x / WORLD_SCALE;
        const y = marker.y / WORLD_SCALE;
        if (marker.kind === "player") {
          const pulse = 4 + Math.sin(tick * 0.2) * 2;
          ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, pulse, 0, TAU);
          ctx.stroke();
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.75;
          ctx.stroke();
        } else {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      },
    );
  };

  const drawViewport = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = deps.getViewport();
    const { panX, panY, zoom } = deps.getCamera();
    const viewWidth = width / zoom;
    const viewHeight = height / zoom;
    const viewX = -(panX + (1 - zoom) * width * 0.48) / zoom;
    const viewY = -(panY + (1 - zoom) * height * 0.48) / zoom;
    ctx.strokeStyle = "rgba(212, 175, 55, 0.85)";
    ctx.lineWidth = 1.25;
    ctx.strokeRect(
      viewX / WORLD_SCALE,
      viewY / WORLD_SCALE,
      viewWidth / WORLD_SCALE,
      viewHeight / WORLD_SCALE,
    );

    ctx.fillStyle = "rgba(10, 20, 30, 0.9)";
    ctx.fillRect(0, 106, MINIMAP_WIDTH, 14);
    ctx.fillStyle = "#c5a059";
    ctx.fillRect(0, 106, MINIMAP_WIDTH, 1);
    ctx.fillStyle = "#ffd34d";
    ctx.font = "bold 9px Courier New, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `X:${Math.round(viewX + viewWidth / 2)} Y:${Math.round(viewY + viewHeight / 2)}`,
      80,
      116,
    );
  };

  const draw = () => {
    if (!canvas || !context) return;
    const dpr = Math.max(1, deps.getDpr());
    resizeCanvas(dpr);
    context.save();
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(context);
    deps.getRegions().forEach((region) => drawRegion(context!, region, false));
    deps.getIslets().forEach((region) => drawRegion(context!, region, true));
    drawTownMarkers(context);
    drawViewport(context);
    context.restore();
  };

  return {
    setCanvas(nextCanvas) {
      if (canvas === nextCanvas) return;
      detach();
      canvas = nextCanvas || null;
      context = canvas?.getContext("2d") || null;
      attach();
    },
    draw,
    isDragging: () => dragging,
    destroy: detach,
  };
}
