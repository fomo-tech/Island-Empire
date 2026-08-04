export type MapPoint = { x: number; y: number };

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function polylineLength(points: MapPoint[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  return total;
}

export function pointAlongPolyline(points: MapPoint[], progress: number) {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  const total = polylineLength(points);
  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= length || i === points.length - 1) {
      const t = length > 0 ? Math.min(1, remaining / length) : 1;
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}
