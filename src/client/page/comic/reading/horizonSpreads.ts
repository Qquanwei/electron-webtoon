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

export function spreadIndexToPageIndex(spreadIndex: number) {
  if (spreadIndex <= 0) return 0;
  return spreadIndex * 2 - 1;
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
