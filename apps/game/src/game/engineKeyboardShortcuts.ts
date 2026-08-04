// @ts-nocheck

export function createKeyboardShortcutsHelpers(deps: {
  state: any;
  toggleFullscreen: () => void;
  toggleHideTerritoryAssets: () => void;
  centerCameraOnWorldContent: () => void;
  toast: (message: string) => void;
  saveCamera: () => void;
}) {
  const {
    state,
    toggleFullscreen,
    toggleHideTerritoryAssets,
    centerCameraOnWorldContent,
    toast,
    saveCamera,
  } = deps;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      state.selectedRegion = null;
      state.selected = null;
    }
    if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_") {
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === "f") toggleFullscreen();
    if (
      e.key.toLowerCase() === "h" &&
      !(
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as any)?.isContentEditable
      )
    ) {
      toggleHideTerritoryAssets();
    }
    if (e.key === "0") {
      centerCameraOnWorldContent();
      toast("CAMERA XA ÄÃƒ RESET");
      saveCamera();
    }
  };

  function registerKeyboardShortcuts() {
    window.addEventListener("keydown", onKeyDown);
  }

  function unregisterKeyboardShortcuts() {
    window.removeEventListener("keydown", onKeyDown);
  }

  return {
    registerKeyboardShortcuts,
    unregisterKeyboardShortcuts,
  };
}
