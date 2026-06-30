export const FRAME_VARIANTS = [
  "walnut",
  "goldOrnate",
  "blackThin",
  "blackBevel",
  "naturalWood",
  "silverAccent",
  "champagne",
  "charcoal",
] as const;

export type FrameVariantId = (typeof FRAME_VARIANTS)[number];

export function getFrameVariant(id: string): FrameVariantId {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return FRAME_VARIANTS[Math.abs(hash) % FRAME_VARIANTS.length];
}
