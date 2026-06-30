import type { PageFlip } from "page-flip";

type FlipCorner = "top" | "bottom";

/** 日漫翻页：向前用左缘 flipPrev，向后用右缘 flipNext（与 page-flip 默认相反） */
export function flipMangaSpread(
  pageFlip: PageFlip,
  targetFlipPageIndex: number,
  forward: boolean,
): void {
  const collection = pageFlip.getPageCollection();
  const currentSpread = collection.getCurrentSpreadIndex();
  const targetSpread = collection.getSpreadIndexByPage(targetFlipPageIndex);
  if (targetSpread === null || targetSpread === currentSpread) {
    return;
  }

  const corner: FlipCorner = forward ? "bottom" : "top";
  const spreadCount = collection.getSpread().length;

  if (targetSpread > currentSpread) {
    if (targetSpread + 1 < spreadCount) {
      collection.setCurrentSpreadIndex(targetSpread + 1);
      pageFlip.flipPrev(corner);
    } else {
      collection.setCurrentSpreadIndex(targetSpread - 1);
      pageFlip.flipNext(corner);
    }
    return;
  }

  if (targetSpread - 1 >= 0) {
    collection.setCurrentSpreadIndex(targetSpread - 1);
    pageFlip.flipNext(corner);
  } else {
    collection.setCurrentSpreadIndex(targetSpread + 1);
    pageFlip.flipPrev(corner);
  }
}
