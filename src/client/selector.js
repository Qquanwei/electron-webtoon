import { selector, selectorFamily } from 'recoil';
import ipc from './ipc';

export const comicList = selector({
  key: 'comicList',
  get: () => ipc.fetchComicList(),
});

export const comicDetail = selectorFamily({
  key: 'comicDetailFamily',
  get: (id) => async () => {
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
