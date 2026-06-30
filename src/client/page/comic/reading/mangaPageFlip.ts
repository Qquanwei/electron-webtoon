import type { PageFlip } from "page-flip";

type FlipCorner = "top" | "bottom";

export type MangaTurnDirection = "forward" | "back";

export interface MangaFoldBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  pageWidth: number;
}

export interface MangaFoldPoint {
  x: number;
  y: number;
}

export interface MangaDragFoldPrep {
  previousSpreadIndex: number;
  previousLogicalSpread: number;
  targetLogicalSpread: number;
}

function offsetMangaSpreadIndex(
  collection: ReturnType<PageFlip["getPageCollection"]>,
  targetSpread: number,
  currentSpread: number,
) {
  if (targetSpread > currentSpread) {
    collection.setCurrentSpreadIndex(targetSpread + 1);
    return;
  }

  collection.setCurrentSpreadIndex(targetSpread - 1);
}

function foldDragProgress(
  pos: MangaFoldPoint,
  startPos: MangaFoldPoint,
  bounds: MangaFoldBounds,
  direction: MangaTurnDirection,
) {
  const bookX = pos.x - bounds.left;
  const bookY = pos.y - bounds.top;
  const startBookX = startPos.x - bounds.left;
  const startBookY = startPos.y - bounds.top;
  const maxDrag = bounds.pageWidth * 0.92;
  const dy = Math.abs(bookY - startBookY);

  if (direction === "forward") {
    const dx = Math.max(0, bookX - startBookX);
    return Math.min(1, Math.hypot(dx, dy) / maxDrag);
  }

  const dx = Math.max(0, startBookX - bookX);
  return Math.min(1, Math.hypot(dx, dy) / maxDrag);
}

/**
 * 将拖动坐标映射为与 flipPrev / flipNext 相同的书脊折角轨迹。
 * page-flip 原生 fold 按触点开始算，从左/右外缘拖会看到页面反面。
 */
export function mapMangaFoldDistPos(
  pos: MangaFoldPoint,
  startPos: MangaFoldPoint,
  bounds: MangaFoldBounds,
  direction: MangaTurnDirection,
): MangaFoldPoint {
  const margin = 12;
  const progress = foldDragProgress(pos, startPos, bounds, direction);

  if (direction === "forward") {
    const mappedBookX =
      margin + progress * Math.max(margin, bounds.width - margin - 8);

    return {
      x: bounds.left + mappedBookX,
      y: startPos.y,
    };
  }

  const mappedBookX =
    bounds.width - margin - progress * Math.max(margin, bounds.width - 2 * margin);

  return {
    x: bounds.left + mappedBookX,
    y: startPos.y,
  };
}

/** 拖动折页前预置 spread，使底层/翻动页与 flipMangaSpread 一致 */
export function prepareMangaDragFold(
  pageFlip: PageFlip,
  targetFlipPageIndex: number,
  previousLogicalSpread: number,
  targetLogicalSpread: number,
): MangaDragFoldPrep | null {
  const collection = pageFlip.getPageCollection();
  const currentSpread = collection.getCurrentSpreadIndex();
  const targetSpread = collection.getSpreadIndexByPage(targetFlipPageIndex);
  if (targetSpread === null || targetSpread === currentSpread) {
    return null;
  }

  const previousSpreadIndex = currentSpread;
  offsetMangaSpreadIndex(collection, targetSpread, currentSpread);

  return {
    previousSpreadIndex,
    previousLogicalSpread,
    targetLogicalSpread,
  };
}

export function revertMangaDragFold(
  pageFlip: PageFlip,
  prep: MangaDragFoldPrep,
  restoreFlipPageIndex: number,
) {
  const collection = pageFlip.getPageCollection();
  collection.setCurrentSpreadIndex(prep.previousSpreadIndex);
  pageFlip.turnToPage(restoreFlipPageIndex);
}

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

  offsetMangaSpreadIndex(collection, targetSpread, currentSpread);

  if (targetSpread > currentSpread) {
    pageFlip.flipPrev(corner);
    return;
  }

  pageFlip.flipNext(corner);
}
