import { flattenImgList } from "./flattenImgList";
import type { IChapter, IComic, IImgList } from "./type";

function parseReadPosition(position: IComic["position"]): number {
  const value = Number(position);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isMultiChapter(imgList: IImgList): boolean {
  return imgList.length > 0 && typeof imgList[0] !== "string";
}

function pagesBeforeChapter(items: IImgList, tag: string): number | null {
  let count = 0;

  for (const item of items) {
    if (typeof item === "string") {
      count += 1;
      continue;
    }

    const chapter = item as IChapter;
    if (chapter.name === tag) {
      return count;
    }

    const nested = pagesBeforeChapter(chapter.list as IImgList, tag);
    if (nested !== null) {
      return count + nested;
    }

    count += flattenImgList(chapter.list).length;
  }

  return null;
}

export function getComicReadAbsoluteIndex(
  comic: Pick<IComic, "position" | "tag">,
  imgList: IImgList,
): number {
  const position = parseReadPosition(comic.position);
  const total = flattenImgList(imgList).length;

  if (total <= 0) {
    return 0;
  }

  if (!isMultiChapter(imgList)) {
    return Math.min(position, total - 1);
  }

  const tag = comic.tag?.trim();
  if (!tag) {
    return Math.min(position, total - 1);
  }

  const before = pagesBeforeChapter(imgList, tag);
  if (before === null) {
    return 0;
  }

  return Math.min(before + position, total - 1);
}

export function getComicReadProgressPercent(
  comic: Pick<IComic, "position" | "tag">,
  imgList: IImgList,
): number {
  const total = flattenImgList(imgList).length;
  if (total <= 1) {
    return total === 1 && parseReadPosition(comic.position) > 0 ? 100 : 0;
  }

  const absoluteIndex = getComicReadAbsoluteIndex(comic, imgList);
  return Math.min(
    100,
    Math.max(0, Math.round((absoluteIndex / (total - 1)) * 100)),
  );
}
