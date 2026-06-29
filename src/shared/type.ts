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
  pageMode?: "horizon" | "vertical";
}

export interface IChapter {
  name: string;
  list: IImgListForSingleChapter | IImgListForMultipleChapter;
}
export type IImgListForSingleChapter = string[];
export type IImgListForMultipleChapter = IChapter[];

export type IImgList = IImgListForMultipleChapter | IImgListForSingleChapter;
