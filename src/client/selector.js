import { selector, selectorFamily } from "recoil";
import { LOADING_COVERLIST_KEY } from "../config";
import ipc from "./ipc";

/* eslint-disable @typescript-eslint/no-shadow */
async function buildCoverList(comicList) {
  const coverList = comicList.map((comic) => {
    return comic.cover;
  });

  (await ipc).set(LOADING_COVERLIST_KEY, coverList);
}

export const comicList = selector({
  key: "comicList",
  get: async () => {
    const comicList = await (await ipc).fetchComicList();
    await buildCoverList(comicList);
    return comicList;
  },
});

export const comicDetail = selectorFamily({
  key: "comicDetailFamily",
  get: (id) => async () => {
    const [comic, imgList] = await Promise.all([
      (await ipc).fetchComic(id),
      (await ipc).fetchImgList(id),
    ]);

    return {
      comic,
      imgList,
    };
  },
});
