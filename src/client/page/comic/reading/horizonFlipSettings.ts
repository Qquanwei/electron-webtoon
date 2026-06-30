export interface HorizonFlipBookSettings {
  drawShadow: boolean;
  maxShadowOpacity: number;
  flippingTime: number;
}

const FLIP_DURATION_MS = 750;

export function getHorizonFlipBookSettings(): HorizonFlipBookSettings {
  return {
    drawShadow: true,
    maxShadowOpacity: 0.55,
    flippingTime: FLIP_DURATION_MS,
  };
}

export const HORIZON_FLIP_DURATION_MS = FLIP_DURATION_MS;
