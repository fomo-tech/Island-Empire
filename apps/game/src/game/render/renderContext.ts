export type RenderContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  zoom: number;
  panX: number;
  panY: number;
  tick: number;
};

export type RenderSurface = Pick<RenderContext, "ctx" | "width" | "height">;
