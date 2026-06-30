import { selector, selectorFamily, atom } from "recoil";
import { LOADING_COVERLIST_KEY } from "../config";
import { IComic } from "@shared/type";
import { getIPC } from "./ipc";

/* eslint-disable @typescript-eslint/no-shadow */
async function buildCoverList(comicList: IComic[]) {
  const coverList = comicList.map((comic) => {
    return comic.cover;
  });
  const ipc = await getIPC();
  await ipc.set(LOADING_COVERLIST_KEY, coverList);
}

export const comicList = selector({
  key: "comicList",
  get: async () => {
    const ipc = await getIPC();
    const comicList = await ipc.fetchComicList();
    await buildCoverList(comicList);
    return comicList;
  },
});

export const comicDetail = selectorFamily({
  key: "comicDetailFamily",
  get: (id: string) => async () => {
    const ipc = await getIPC();
    const [comic, imgList] = await Promise.all([
      ipc.fetchComic(id),
      ipc.fetchImgList(id),
    ]);
    return {
      comic,
      imgList,
    };
  },
});

export interface ComicOpenInfo {
  cover: string;
  comicId?: string;
  /** 翻开封面后露出的内页（通常为第 2 页） */
  innerPage?: string;
  originRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export type ComicOpenPhase =
  | "idle"
  | "fly-start"
  | "fly-active"
  | "open-active"
  | "loading";

export const nextOpenComicInfo = atom<ComicOpenInfo | null>({
  key: "next open comic info",
  default: null,
});

export const comicOpenPhase = atom<ComicOpenPhase>({
  key: "comic open phase",
  default: "idle",
});

export const comicReaderLoading = atom<boolean>({
  key: "comic reader loading",
  default: false,
});
