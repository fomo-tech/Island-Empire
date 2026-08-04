// @ts-nocheck

export function markMainlandCoastalRegions(deps: {
  regions: any[];
  nearestContinent: (region: any) => any;
  regionAtCoords: (x: number, y: number) => number;
  mainlandCoastalRegionIds: Set<number>;
}) {
  const {
    regions,
    nearestContinent,
    regionAtCoords,
    mainlandCoastalRegionIds,
  } = deps;

  regions.forEach((r: any) => {
    const continent = nearestContinent(r);
    if (!continent) return;
    const nx = (r.x - continent.x) / continent.rx;
    const ny = (r.y - continent.y) / continent.ry;
    const edgeScore = Math.sqrt(nx * nx + ny * ny);
    if (edgeScore < 0.58) return;

    const rx = r.rx || r.r || 180;
    const ry = r.ry || (r.r || 180) * 0.78;
    const outwardAngle = Math.atan2(r.y - continent.y, r.x - continent.x);
    let openSeaSamples = 0;
    for (let i = -2; i <= 2; i++) {
      const angle = outwardAngle + i * (Math.PI / 8);
      const px = r.x + Math.cos(angle) * rx * 1.28;
      const py = r.y + Math.sin(angle) * ry * 1.28;
      if (regionAtCoords(px, py) < 0) {
        openSeaSamples++;
      }
    }
    if (openSeaSamples >= 2) mainlandCoastalRegionIds.add(r.id);
  });
}

export function normalizeTownCenters(deps: {
  towns: any[];
  regions: any[];
  normalizeTown: (town: any) => void;
  getOptimalTownCenter: (regionId: number) => { x: number; y: number } | null;
}) {
  const { towns, regions, normalizeTown, getOptimalTownCenter } = deps;

  towns.forEach((town, i) => {
    normalizeTown(town);
    const regionId = i < regions.length ? i : town.id - 1;
    const pt = getOptimalTownCenter(regionId);
    if (pt && (pt.x !== 0 || pt.y !== 0)) {
      town.x = pt.x;
      town.y = pt.y;
    }
  });
}
