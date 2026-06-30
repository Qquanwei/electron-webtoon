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

/** page-flip DOM 页序：0, 2,1, 4,3, … 使书脊两侧与 preview 一致 */
export function buildMangaFlipOrder(pageCount: number): number[] {
  const order: number[] = [0];
  for (let i = 1; i < pageCount; i += 2) {
    if (i + 1 < pageCount) {
      order.push(i + 1, i);
    } else {
      order.push(i);
    }
  }
  return order;
}

export function spreadToFlipIndex(
  spreadIndex: number,
  spreads: HorizonSpread[],
  flipOrder: number[],
): number {
  if (spreadIndex <= 0) return 0;
  const spread = spreads[spreadIndex];
  if (!spread) return 0;
  const page = spread.leftIndex ?? spread.rightIndex;
  return flipOrder.indexOf(page);
}

export function flipIndexToSpreadIndex(
  flipIndex: number,
  flipOrder: number[],
): number {
  const page = flipOrder[flipIndex] ?? 0;
  return pageIndexToSpreadIndex(page);
}
