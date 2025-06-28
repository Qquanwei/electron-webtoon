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

export const nextOpenComicInfo = atom<Partial<IComic> | null>({
  key: "next open comic info",
  default: null,
});
