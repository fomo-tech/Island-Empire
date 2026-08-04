import { hash } from "./random";

const TAU = Math.PI * 2;
export type PolygonPoint = [number, number];

export function facetedRegionPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
): PolygonPoint[] {
  const style = Math.floor(hash(seed * 137) * 8);
  const numVertices = 18 + Math.floor(hash(seed * 43) * 14);
  const stretchAngle = hash(seed * 223) * TAU;
  const stretchAmount = 0.2 + hash(seed * 311) * 0.3;
  const points: PolygonPoint[] = [];

  for (let i = 0; i < numVertices; i++) {
    const baseAngle = (i / numVertices) * TAU - Math.PI / 6;
    const anglePerturb = (hash(seed * 71 + i * 19) - 0.5) * 0.42;
    const angle = baseAngle + anglePerturb;
    let radiusMult = 0.78 + hash(seed * 113 + i * 29) * 0.44;

    if (style === 1) {
      radiusMult += Math.cos(angle - stretchAngle) * stretchAmount;
    } else if (style === 2) {
      radiusMult +=
        Math.sin(angle * 4 + seed * 0.8) * 0.24 +
        Math.cos(angle * 7 - seed * 0.3) * 0.12;
    } else if (style === 3) {
      radiusMult += Math.cos(angle * 2.5 + seed * 1.3) * 0.28;
    } else if (style === 4) {
      radiusMult += Math.abs(Math.sin(angle * 2.5 + seed)) * 0.22 - 0.11;
    } else if (style === 5) {
      radiusMult += (i % 2 === 0 ? 0.18 : -0.12) + Math.sin(angle * 5.5) * 0.15;
    } else if (style === 6) {
      radiusMult += Math.cos(angle * 1.5 + seed) * 0.32;
    } else if (style === 7) {
      radiusMult += Math.sin(angle * 8 + seed * 2.1) * 0.16;
    }

    points.push([
      Math.round((cx + Math.cos(angle) * rx * radiusMult) * 2) / 2,
      Math.round((cy + Math.sin(angle) * ry * radiusMult) * 2) / 2,
    ]);
  }
  return points;
}

export function ensureMinVertices(
  points: PolygonPoint[],
  minVertices: number,
): PolygonPoint[] {
  if (points.length >= minVertices) return points;
  const result = [...points];
  while (result.length < minVertices) {
    let longest = 0;
    let longestIndex = 0;
    for (let i = 0; i < result.length; i++) {
      const next = result[(i + 1) % result.length];
      const length = Math.hypot(
        next[0] - result[i][0],
        next[1] - result[i][1],
      );
      if (length > longest) {
        longest = length;
        longestIndex = i;
      }
    }
    const first = result[longestIndex];
    const second = result[(longestIndex + 1) % result.length];
    const midpoint: PolygonPoint = [
      Math.round((first[0] + second[0]) / 2),
      Math.round((first[1] + second[1]) / 2),
    ];
    result.splice(longestIndex + 1, 0, midpoint);
  }
  return result;
}

export function organicPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
): PolygonPoint[] {
  const points: PolygonPoint[] = [];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU;
    const chip = hash(seed * 97 + i * 13) * 0.1 - 0.05;
    const wave =
      1 +
      Math.sin(angle * 5 + seed * 1.7) * 0.08 +
      Math.cos(angle * 9 - seed * 0.5) * 0.05 +
      chip;
    points.push([
      Math.round((cx + Math.cos(angle) * rx * wave) * 2) / 2,
      Math.round((cy + Math.sin(angle) * ry * wave) * 2) / 2,
    ]);
  }
  return points;
}

export function warpPoint(x: number, y: number): PolygonPoint {
  const scale1 = 0.015;
  const scale2 = 0.035;
  const dx =
    Math.sin(x * scale1 + y * scale1) * 8 +
    Math.cos(x * scale2 - y * scale2) * 3.5;
  const dy =
    Math.cos(x * scale1 - y * scale1) * 8 +
    Math.sin(x * scale2 + y * scale2) * 3.5;
  return [Math.round((x + dx) * 2) / 2, Math.round((y + dy) * 2) / 2];
}

export function subdividePolygon(
  polygon: PolygonPoint[],
  maxSegmentLength = 20,
): PolygonPoint[] {
  const result: PolygonPoint[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const first = polygon[i];
    const second = polygon[(i + 1) % polygon.length];
    result.push(first);
    const dx = second[0] - first[0];
    const dy = second[1] - first[1];
    const distance = Math.hypot(dx, dy);
    if (distance <= maxSegmentLength) continue;
    const segmentCount = Math.ceil(distance / maxSegmentLength);
    for (let j = 1; j < segmentCount; j++) {
      const progress = j / segmentCount;
      result.push([
        Math.round((first[0] + dx * progress) * 2) / 2,
        Math.round((first[1] + dy * progress) * 2) / 2,
      ]);
    }
  }
  return result;
}
