import type { RenderSurface } from "./renderContext";

/** Draws only the screen-space ocean base; world layers are composed by engine.ts. */
export function drawOcean({ ctx, width, height }: RenderSurface) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#071825");
  gradient.addColorStop(0.48, "#0a263b");
  gradient.addColorStop(1, "#061521");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const lightGradient = ctx.createRadialGradient(
    width / 2,
    height / 3,
    50,
    width / 2,
    height / 3,
    width,
  );
  lightGradient.addColorStop(0, "rgba(56, 189, 248, 0.10)");
  lightGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width, height);
}
