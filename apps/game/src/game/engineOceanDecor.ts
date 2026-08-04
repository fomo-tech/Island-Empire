// @ts-nocheck

export function createOceanDecorDrawers(deps: {
  ctx: CanvasRenderingContext2D;
  state: any;
}) {
  const { ctx, state } = deps;

  function drawCompassRose(cx: number, cy: number) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = "rgba(12,20,30,0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#c29b4f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#8b6c37";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    const drawPoint = (
      angle: number,
      length: number,
      width: number,
      isMajor: boolean,
    ) => {
      ctx.fillStyle = isMajor ? "#c29b4f" : "#8b6c37";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const radLeft = angle - Math.PI / 2;
      ctx.lineTo(Math.cos(radLeft) * width, Math.sin(radLeft) * width);
      ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isMajor ? "#614e26" : "#45381a";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const radRight = angle + Math.PI / 2;
      ctx.lineTo(Math.cos(radRight) * width, Math.sin(radRight) * width);
      ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
      ctx.closePath();
      ctx.fill();
    };

    for (let i = 0; i < 4; i++) drawPoint((i * Math.PI) / 2, 38, 5, true);
    for (let i = 0; i < 4; i++)
      drawPoint((i * Math.PI) / 2 + Math.PI / 4, 25, 3.5, false);

    ctx.fillStyle = "#fdfbf7";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c29b4f";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd34d";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 0, -47);
    ctx.fillText("S", 0, 47);
    ctx.fillText("E", 47, 0);
    ctx.fillText("W", -47, 0);
    ctx.restore();
  }

  function drawSailingShip(x: number, y: number, seed: number) {
    const bob = Math.sin(state.tick * 0.04 + seed) * 3.5;
    const tilt = Math.sin(state.tick * 0.03 + seed) * 0.06;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(tilt);

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-14, 5, 28, 4);

    ctx.fillStyle = "#5c4033";
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 6);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-12, -2, 22, 2);

    ctx.fillStyle = "#332211";
    ctx.fillRect(-4, -22, 2, 20);
    ctx.fillRect(4, -16, 1.5, 14);

    ctx.fillStyle = "#fdfbf7";
    ctx.beginPath();
    ctx.moveTo(-3, -22);
    ctx.quadraticCurveTo(-11, -12, -3, -4);
    ctx.quadraticCurveTo(-1, -12, -3, -22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(5, -16);
    ctx.quadraticCurveTo(0, -9, 5, -3);
    ctx.quadraticCurveTo(7, -9, 5, -16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffd34d";
    ctx.beginPath();
    ctx.moveTo(-3, -22);
    ctx.lineTo(-9, -20 + Math.sin(state.tick * 0.15) * 1.5);
    ctx.lineTo(-3, -18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawSeaMonster(x: number, y: number, seed: number) {
    const bob = Math.sin(state.tick * 0.05 + seed) * 6;
    const wave = Math.sin(state.tick * 0.08 + seed) * 4;

    ctx.save();
    ctx.translate(x, y + bob);

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2d1f3b";
    ctx.strokeStyle = "#493561";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.bezierCurveTo(-12 + wave, -10, 4 + wave, -18, 0, -26);
    ctx.bezierCurveTo(8 + wave, -18, -4 + wave, -10, 8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(-10 + Math.sin(state.tick * 0.2) * 2, 4, 4, 2);
    ctx.fillRect(6 + Math.cos(state.tick * 0.2) * 2, 3, 4, 2);

    ctx.restore();
  }

  function drawWorldOceanDetails() {
    drawCompassRose(530, 180);
    drawSailingShip(280, 140, 101);
    drawSailingShip(760, 390, 202);
    drawSeaMonster(130, 480, 303);
  }

  return {
    drawCompassRose,
    drawSailingShip,
    drawSeaMonster,
    drawWorldOceanDetails,
  };
}
