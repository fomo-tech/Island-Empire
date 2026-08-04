// @ts-nocheck

export function createCanvasUiHelpers(deps: {
  ctxRef: () => CanvasRenderingContext2D;
}) {
  const { ctxRef } = deps;

  function pxRect(x: number, y: number, w: number, h: number, color: string) {
    const ctx = ctxRef();
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function text(
    str: string,
    x: number,
    y: number,
    size: number,
    color?: string,
    align?: CanvasTextAlign,
  ) {
    const ctx = ctxRef();
    ctx.font = `700 ${size}px 'Outfit', 'Inter', system-ui, sans-serif`;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.lineWidth = Math.max(2, Math.floor(size / 5));
    ctx.strokeStyle = "#071018";
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color || "#fff4ce";
    ctx.fillText(str, x, y);
  }

  function panel(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string | undefined,
  ) {
    const ctx = ctxRef();
    pxRect(x + 5, y + 5, w, h, "rgba(0,0,0,0.35)");
    pxRect(x, y, w, h, "#0b1e2a");
    pxRect(x + 4, y + 4, w - 8, h - 8, "#183040");
    pxRect(x + 8, y + 8, w - 16, h - 16, "#102633");
    ctx.strokeStyle = "#513922";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = "#8d6a3e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
    if (title) {
      pxRect(x + 8, y + 8, w - 16, 38, "#162c39");
      text(title, x + 18, y + 17, 21, "#ffd34d");
    }
  }

  return {
    pxRect,
    text,
    panel,
  };
}
