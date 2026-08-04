// @ts-nocheck

export function createCanvasClickActionHelpers(deps: {
  state: any;
  HRef: () => number;
  onLayoutAction?: (actionId: string, payload?: any) => void;
  gearAt: (x: number, y: number) => boolean;
  toggleFullscreen: () => void;
  buttonAt: (x: number, y: number) => any;
  handleButton: (id: string) => void;
  townAt: (x: number, y: number) => any;
  regionAt: (x: number, y: number) => number | null;
  derivedRegionOwnership: (regionId: number) => number;
  landById: (regionId: number) => any;
  panCameraTo: (x: number, y: number) => void;
  toast: (message: string) => void;
}) {
  const {
    state,
    HRef,
    onLayoutAction,
    gearAt,
    toggleFullscreen,
    buttonAt,
    handleButton,
    townAt,
    regionAt,
    derivedRegionOwnership,
    landById,
    panCameraTo,
    toast,
  } = deps;

  function handleCanvasClickAt(p: { x: number; y: number }) {
    const H = HRef();

    const isChatInput =
      p.x >= 34 && p.y >= H - 70 && p.x <= 34 + 253 && p.y <= H - 70 + 36;
    const isChatSend =
      p.x >= 302 && p.y >= H - 74 && p.x <= 302 + 42 && p.y <= H - 74 + 42;
    if (isChatInput || isChatSend) {
      onLayoutAction?.("chat");
      return;
    }

    if (gearAt(p.x, p.y)) {
      toggleFullscreen();
      return;
    }

    const b = buttonAt(p.x, p.y);
    if (b) {
      handleButton(b.id);
      return;
    }

    const t = townAt(p.x, p.y);
    if (t) {
      if (t.owner === 0) {
        state.selected = t.id;
        state.selectedRegion = null;
        toast("QUáº¢N LÃ THÃ€NH TRÃŒ Cá»¦A Báº N");
      } else {
        state.selected = t.id;
        state.selectedRegion = regionAt(p.x, p.y);
        toast(`THÃ€NH TRÃŒ Cá»¦A Äá»ŠCH #${t.id}`);
      }
      panCameraTo(t.x, t.y);
      return;
    }

    const region = regionAt(p.x, p.y);
    if (region === null) {
      state.selectedRegion = null;
      state.selected = null;
      return;
    }

    const ownership = derivedRegionOwnership(region);
    const r = landById(region);

    if (ownership === 1) {
      state.selectedRegion = region;
      state.selected = null;
      toast("QUáº¢N LÃ LÃƒNH THá»” Cá»¦A Báº N");
      if (r) panCameraTo(r.x, r.y);
      return;
    }

    state.selectedRegion = region;
    state.selected = null;
    if (r) panCameraTo(r.x, r.y);

    if (ownership === 0) {
      toast(
        `ÄÃƒ CHá»ŒN LÃƒNH THá»” ${region + 1} - Báº¤M XÃ‚Y THÃ€NH TRÃŠN TOOLTIP`,
      );
      return;
    }

    toast(`LÃƒNH THá»” ${region + 1} ÄÃƒ Bá»Š Äá»I THá»¦ CHIáº¾M GIá»®`);
  }

  return {
    handleCanvasClickAt,
  };
}
