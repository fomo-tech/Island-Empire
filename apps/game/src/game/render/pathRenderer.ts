import type { PolygonPoint } from "../engine/worldGeometry";

type Paint = string | CanvasGradient | CanvasPattern;

export function fillPath(
  ctx: CanvasRenderingContext2D,
  points: PolygonPoint[],
  color: Paint,
) {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function traceSmoothPath(ctx: CanvasRenderingContext2D, points: PolygonPoint[]) {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  if (points.length < 3) {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    return;
  }
  const last = points[points.length - 1];
  const first = points[0];
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(
      current[0],
      current[1],
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2,
    );
  }
  ctx.closePath();
}

export function fillSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: PolygonPoint[],
  color: Paint,
) {
  if (!points || points.length === 0) return;
  traceSmoothPath(ctx, points);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: PolygonPoint[],
  strokeStyle: Paint,
  lineWidth: number,
) {
  if (!points || points.length === 0) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  traceSmoothPath(ctx, points);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

export function strokePath(
  ctx: CanvasRenderingContext2D,
  points: PolygonPoint[],
  strokeStyle: Paint,
  lineWidth: number,
) {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineCap = "round";
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}
