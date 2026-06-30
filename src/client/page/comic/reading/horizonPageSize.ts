const MIN_PAGE_WIDTH = 240;
const MIN_PAGE_HEIGHT = 320;

export function computeHorizonPageSize(
  areaWidth: number,
  areaHeight: number,
  pageAspectRatio: number,
) {
  const safeAspect =
    Number.isFinite(pageAspectRatio) && pageAspectRatio > 0
      ? pageAspectRatio
      : 0.7;

  const maxPageWidth = Math.max(MIN_PAGE_WIDTH, Math.floor(areaWidth / 2));
  const maxPageHeight = Math.max(MIN_PAGE_HEIGHT, Math.floor(areaHeight - 8));

  let pageHeight = maxPageHeight;
  let pageWidth = Math.floor(pageHeight * safeAspect);

  if (pageWidth > maxPageWidth) {
    pageWidth = maxPageWidth;
    pageHeight = Math.floor(pageWidth / safeAspect);
  }

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

/** 封面常为横版，用前几页内页估算单页宽高比 */
export async function loadHorizonPageAspectRatio(
  imgList: string[],
): Promise<number> {
  if (!imgList.length) {
    return 0.7;
  }

  const sampleSrcs = imgList.slice(1, 4);
  const sources = sampleSrcs.length > 0 ? sampleSrcs : [imgList[0]];

  const aspects = await Promise.all(
    sources.map((src) =>
      loadImageAspectRatio(src).catch(() => Number.NaN),
    ),
  );

  const valid = aspects.filter(
    (aspect) => Number.isFinite(aspect) && aspect > 0,
  );
  if (!valid.length) {
    return 0.7;
  }

  return Math.min(...valid);
}
