export type CameraLayout = "world" | "conquest";

export const BASE_ZOOM = 1;
export const FIXED_FAR_ZOOM = 0.52;
export const MAX_ZOOM = 4;

export function getZoomTier(zoom: number) {
  if (zoom < 0.28) return 0;
  if (zoom < 0.5) return 1;
  if (zoom < 0.66) return 2;
  if (zoom < 0.75) return 3;
  return 4;
}

export function getMinZoom(viewportWidth: number) {
  // The far strategic overview is intentionally available on every device.
  // It is lightweight-only, so 0.05x remains cheap to render even on mobile.
  return 0.05;
}

export function getDefaultFarZoom(
  viewportWidth: number,
  layout: CameraLayout = "world",
) {
  if (layout === "conquest") return viewportWidth <= 700 ? 0.28 : 0.48;
  if (viewportWidth <= 600) return 0.42;
  if (viewportWidth <= 1024) return 0.4;
  return 0.52;
}

export function cameraStorageKey(layout: CameraLayout = "world") {
  return layout === "conquest"
    ? "island_empire_conquest_camera_v1"
    : "island_empire_camera_v1";
}
