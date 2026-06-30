/**
 * 一元函数
 */
export type UnaryFunction<T, K = unknown> = (value: T) => K;
/**
 * 零元函数
 */
export type EmptyFunction<K = void> = () => K;

export interface Path {
  canceled?: boolean;
  filePaths?: string[];
}

export interface IDecompressProgress {
  active: boolean;
  archiveIndex: number;
  archiveTotal: number;
  archiveName: string;
  entryProcessed: number;
  entryTotal: number;
  percent: number;
}

export const IDLE_DECOMPRESS_PROGRESS: IDecompressProgress = {
  active: false,
  archiveIndex: 0,
  archiveTotal: 0,
  archiveName: "",
  entryProcessed: 0,
  entryTotal: 0,
  percent: 0,
};

export type { IpcClient } from "./ipc/contract";

export type ComicPageMode = "horizon" | "vertical";

export const DEFAULT_COMIC_PAGE_MODE: ComicPageMode = "horizon";

export function resolveComicPageMode(
  pageMode?: ComicPageMode,
): ComicPageMode {
  return pageMode ?? DEFAULT_COMIC_PAGE_MODE;
}

export interface IComic {
  id: string;
  tag: string;
  cover: string;
  name: string;
  width: number;
  height: number;
  position: string | number;
  /**
   * 横竖屏翻页模式
   */
  pageMode?: ComicPageMode;
  /**
   * 阅读缩放比例
   */
  zoomScale?: number | string;
  /**
   * 阅读进度 0–100，持久化在配置中
   */
  readProgressPercent?: number;
  /**
   * 首页轮播预览图 URL，持久化在配置中
   */
  previewUrls?: string[];
}

export interface IChapter {
  name: string;
  list: IImgListForSingleChapter | IImgListForMultipleChapter;
}
export type IImgListForSingleChapter = string[];
export type IImgListForMultipleChapter = IChapter[];

export type IImgList = IImgListForMultipleChapter | IImgListForSingleChapter;
