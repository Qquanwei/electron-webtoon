export const COMIC_ZOOM_MIN = 0.5;
export const COMIC_ZOOM_MAX = 3;
export const COMIC_ZOOM_DEFAULT = 1;
export const COMIC_ZOOM_PROPERTY = "zoomScale";

export function clampComicZoom(value: number) {
  return Math.min(COMIC_ZOOM_MAX, Math.max(COMIC_ZOOM_MIN, value));
}

export function parseComicZoom(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return COMIC_ZOOM_DEFAULT;
  return clampComicZoom(num);
}

export function applyWheelZoom(current: number, deltaY: number) {
  return clampComicZoom(current * Math.pow(1.002, -deltaY));
}

export function formatComicZoom(value: number) {
  return clampComicZoom(value).toFixed(2);
}
