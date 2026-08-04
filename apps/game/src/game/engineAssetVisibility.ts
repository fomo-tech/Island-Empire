// @ts-nocheck

export function createAssetVisibilityHelpers(deps: {
  toast: (message: string) => void;
}) {
  const { toast } = deps;

  let hideTerritoryAssets = false;

  function toggleHideTerritoryAssets(forceValue?: boolean) {
    hideTerritoryAssets =
      forceValue !== undefined ? forceValue : !hideTerritoryAssets;
    localStorage.setItem(
      "island_empire_hide_assets",
      hideTerritoryAssets ? "true" : "false",
    );
    if (hideTerritoryAssets) {
      toast(
        "âš¡ ÄÃƒ áº¨N TÃ€I NGUYÃŠN & ASSETS LÃƒNH THá»” (TEST HIá»†U SUáº¤T)",
      );
    } else {
      toast("ðŸŒ¿ ÄÃƒ HIá»‚N THá»Š Láº I TÃ€I NGUYÃŠN & ASSETS LÃƒNH THá»”");
    }
    return hideTerritoryAssets;
  }

  function bindWindowDebugToggles() {
    (window as any).toggleHideTerritoryAssets = toggleHideTerritoryAssets;
    (window as any).setHideTerritoryAssets = (hide: boolean) =>
      toggleHideTerritoryAssets(hide);
  }

  function isHidingTerritoryAssets() {
    return hideTerritoryAssets;
  }

  return {
    toggleHideTerritoryAssets,
    bindWindowDebugToggles,
    isHidingTerritoryAssets,
  };
}
