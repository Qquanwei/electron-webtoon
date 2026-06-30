import type { IChapter, IImgListForMultipleChapter } from "@shared/type";

export function findChapterIndex(
  chapterList: IImgListForMultipleChapter,
  chapterName: string,
) {
  return chapterList.findIndex((item) => item.name === chapterName);
}

export function getAdjacentChapter(
  chapterList: IImgListForMultipleChapter,
  current: IChapter,
  offset: -1 | 1,
) {
  const index = findChapterIndex(chapterList, current.name);
  if (index < 0) return current;
  return chapterList[index + offset] ?? current;
}

export function hasNextChapter(
  chapterList: IImgListForMultipleChapter,
  current: IChapter,
) {
  return findChapterIndex(chapterList, current.name) < chapterList.length - 1;
}

export function hasPrevChapter(
  chapterList: IImgListForMultipleChapter,
  current: IChapter,
) {
  return findChapterIndex(chapterList, current.name) > 0;
}
