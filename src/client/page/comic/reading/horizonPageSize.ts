const MIN_PAGE_WIDTH = 240;
const MIN_PAGE_HEIGHT = 320;

/** 日漫单页常见宽高比（宽/高） */
const TYPICAL_PAGE_ASPECT = 0.7;
/** 过窄长条（韩漫条漫切片等）与横版封面/outlier 不参与页槽估算 */
const MIN_PLAUSIBLE_PAGE_ASPECT = 0.45;
const MAX_PLAUSIBLE_PAGE_ASPECT = 1.05;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function clampHorizonPageAspectRatio(aspect: number) {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return TYPICAL_PAGE_ASPECT;
  }
  return Math.min(
    MAX_PLAUSIBLE_PAGE_ASPECT,
    Math.max(MIN_PLAUSIBLE_PAGE_ASPECT, aspect),
  );
}

export function computeHorizonPageSize(
  areaWidth: number,
  areaHeight: number,
  pageAspectRatio: number,
) {
  const safeAspect = clampHorizonPageAspectRatio(pageAspectRatio);

  const maxPageWidth = Math.max(MIN_PAGE_WIDTH, Math.floor(areaWidth / 2));
  const maxPageHeight = Math.max(MIN_PAGE_HEIGHT, Math.floor(areaHeight - 8));

  let pageHeight = maxPageHeight;
  let pageWidth = Math.max(
    MIN_PAGE_WIDTH,
    Math.floor(pageHeight * safeAspect),
  );

  if (pageWidth > maxPageWidth) {
    pageWidth = maxPageWidth;
    pageHeight = Math.floor(pageWidth / safeAspect);
  }

  pageWidth = Math.max(MIN_PAGE_WIDTH, pageWidth);
  pageHeight = Math.max(MIN_PAGE_HEIGHT, pageHeight);

  return { pageWidth, pageHeight };
}

export function loadImageAspectRatio(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(img.naturalWidth / img.naturalHeight);
        return;
      }
      reject(new Error("Invalid image dimensions"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** 封面常为横版；取多页内页中位数，并过滤异常比例 */
export async function loadHorizonPageAspectRatio(
  imgList: string[],
): Promise<number> {
  if (!imgList.length) {
    return TYPICAL_PAGE_ASPECT;
  }

  const sampleIndices = new Set<number>();
  const lastIndex = imgList.length - 1;
  for (let i = 1; i <= Math.min(5, lastIndex); i += 1) {
    sampleIndices.add(i);
  }
  if (imgList.length > 10) {
    sampleIndices.add(Math.floor(imgList.length / 2));
  }
  if (sampleIndices.size === 0) {
    sampleIndices.add(0);
  }

  const aspects = await Promise.all(
    [...sampleIndices].map((index) =>
      loadImageAspectRatio(imgList[index]).catch(() => Number.NaN),
    ),
  );

  const valid = aspects.filter(
    (aspect) => Number.isFinite(aspect) && aspect > 0,
  );
  if (!valid.length) {
    return TYPICAL_PAGE_ASPECT;
  }

  const plausible = valid.filter(
    (aspect) =>
      aspect >= MIN_PLAUSIBLE_PAGE_ASPECT &&
      aspect <= MAX_PLAUSIBLE_PAGE_ASPECT,
  );
  const pool = plausible.length
    ? plausible
    : valid.filter((aspect) => aspect <= 1.2);

  const raw = pool.length ? median(pool) : median(valid);
  return clampHorizonPageAspectRatio(raw);
}
