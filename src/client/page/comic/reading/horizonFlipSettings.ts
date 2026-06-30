export function isWindowsPlatform() {
  return (
    typeof navigator !== "undefined" &&
    /Windows/i.test(navigator.userAgent)
  );
}

export interface HorizonFlipBookSettings {
  drawShadow: boolean;
  maxShadowOpacity: number;
  flippingTime: number;
}

const FLIP_DURATION_MS = 750;

export function getHorizonFlipBookSettings(): HorizonFlipBookSettings {
  if (isWindowsPlatform()) {
    return {
      drawShadow: true,
      maxShadowOpacity: 0.32,
      flippingTime: FLIP_DURATION_MS,
    };
  }

  return {
    drawShadow: true,
    maxShadowOpacity: 0.55,
    flippingTime: FLIP_DURATION_MS,
  };
}

export const HORIZON_FLIP_DURATION_MS = FLIP_DURATION_MS;
