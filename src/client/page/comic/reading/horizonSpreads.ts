export interface HorizonSpread {
  right: string;
  left: string | null;
  rightIndex: number;
  leftIndex: number | null;
  isCover?: boolean;
}

export function isCoverSpread(spread: HorizonSpread) {
  return Boolean(spread.isCover);
}

/** 封面单独一页，之后双页为 [左页, 右页] = [2,1] [4,3] … */
export function buildHorizonSpreads(imgList: string[]): HorizonSpread[] {
  if (!imgList.length) return [];

  const spreads: HorizonSpread[] = [
    {
      right: imgList[0],
      left: null,
      rightIndex: 0,
      leftIndex: null,
      isCover: true,
    },
  ];

  for (let i = 1; i < imgList.length; i += 2) {
    spreads.push({
      right: imgList[i],
      left: imgList[i + 1] ?? null,
      rightIndex: i,
      leftIndex: i + 1 < imgList.length ? i + 1 : null,
    });
  }

  return spreads;
}

export function pageIndexToSpreadIndex(pageIndex: number) {
  if (pageIndex <= 0) return 0;
  return Math.floor((pageIndex + 1) / 2);
}

export function getSpreadIndexForPage(
  spreads: HorizonSpread[],
  pageIndex: number,
): number {
  if (!spreads.length) return 0;
  return Math.min(pageIndexToSpreadIndex(pageIndex), spreads.length - 1);
}

export function getSpreadProgressIndex(spread: HorizonSpread) {
  return spread.leftIndex ?? spread.rightIndex;
}

/** 首页右侧：最后一页模糊图 */
export const HORIZON_FLIP_BLUR_OPENING = -1;

/** 末页左侧：封面（第 0 页）模糊图 */
export const HORIZON_FLIP_BLUR_CLOSING = -2;

/** 首尾缓冲页，仅用于 flip 动画预置，不对应逻辑 spread */
export const HORIZON_FLIP_PAD_PAGE = -3;

export function isHorizonFlipBlurSlot(pageIndex: number) {
  return (
    pageIndex === HORIZON_FLIP_BLUR_OPENING ||
    pageIndex === HORIZON_FLIP_BLUR_CLOSING
  );
}

export function isHorizonFlipPadPage(pageIndex: number) {
  return pageIndex === HORIZON_FLIP_PAD_PAGE;
}

/**
 * page-flip DOM 页序：
 * - 缓冲 [pad, pad]
 * - 首页 [0, 末页模糊]
 * - 中间 [2,1] [4,3] …
 * - 末页（落单时） [0模糊, 末页清晰]
 * - 缓冲 [pad, pad]
 */
export function buildMangaFlipOrder(pageCount: number): number[] {
  if (pageCount <= 0) {
    return [];
  }

  const last = pageCount - 1;
  const order: number[] = [
    HORIZON_FLIP_PAD_PAGE,
    HORIZON_FLIP_PAD_PAGE,
    0,
    HORIZON_FLIP_BLUR_OPENING,
  ];

  for (let i = 1; i < pageCount; i += 2) {
    if (i + 1 < pageCount) {
      order.push(i + 1, i);
    } else if (i === last) {
      order.push(HORIZON_FLIP_BLUR_CLOSING, last);
    }
  }

  order.push(HORIZON_FLIP_PAD_PAGE, HORIZON_FLIP_PAD_PAGE);
  return order;
}

export function spreadToFlipIndex(
  spreadIndex: number,
  spreads: HorizonSpread[],
  flipOrder: number[],
): number {
  if (spreadIndex <= 0) {
    const coverIdx = flipOrder.indexOf(0);
    return coverIdx >= 0 ? coverIdx : 0;
  }
  const spread = spreads[spreadIndex];
  if (!spread) return 0;

  if (spread.leftIndex === null && spread.rightIndex > 0) {
    const closingIdx = flipOrder.indexOf(HORIZON_FLIP_BLUR_CLOSING);
    if (closingIdx >= 0) {
      return closingIdx;
    }
  }

  const page = spread.leftIndex ?? spread.rightIndex;
  const idx = flipOrder.indexOf(page);
  return idx >= 0 ? idx : 0;
}

export function flipIndexToSpreadIndex(
  flipIndex: number,
  flipOrder: number[],
  pageCount: number,
): number {
  const page = flipOrder[flipIndex] ?? 0;
  const last = pageCount - 1;
  const coverFlipIndex = flipOrder.indexOf(0);

  if (page === HORIZON_FLIP_PAD_PAGE) {
    if (coverFlipIndex >= 0 && flipIndex < coverFlipIndex) {
      return 0;
    }
    return pageIndexToSpreadIndex(last);
  }

  if (page === 0 || page === HORIZON_FLIP_BLUR_OPENING) {
    return 0;
  }
  if (page === HORIZON_FLIP_BLUR_CLOSING || page === last) {
    return pageIndexToSpreadIndex(last);
  }
  return pageIndexToSpreadIndex(page);
}
