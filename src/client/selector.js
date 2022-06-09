import { selector, selectorFamily } from 'recoil';
import { LOADING_COVERLIST_KEY } from '../config';
import store from './store';
import ipc from './ipc';

/* eslint-disable @typescript-eslint/no-shadow */
function buildCoverList(comicList) {
  const coverList = comicList.map((comic) => {
    return comic.cover;
  });

  store.set(LOADING_COVERLIST_KEY, coverList);
}

export const comicList = selector({
  key: 'comicList',
  get: async () => {
    const comicList = await (await ipc).fetchComicList();
    buildCoverList(comicList);
    return comicList;
  },
});

function sortImgList(imgList) {
  const list = [...imgList];

  function tonum(name) {
    const num = Number(name.replace(/[^\d]/g, '')) || Infinity;
    return num;
  }

  list.forEach((i) => {
    if (i.list) {
      i.list = sortImgList(i.list);
    }
  });

  list.sort((a, b) => {
    if (a.name) {
      a.list = sortImgList(a.list || []);
    }
    if (b.name) {
      b.list = sortImgList(b.list || []);
    }

    if (a.name && b.name) {
      return tonum(a.name) - tonum(b.name);
    }

    if (!a.name && !b.name) {
      return tonum(a) - tonum(b);
    }
    if (a.name) {
      return 1;
    }

    return -1;
  });

  return list;
}

export const comicDetail = selectorFamily({
  key: 'comicDetailFamily',
  get: (id) => async () => {
    const [comic, imgList] = await Promise.all([
      (await ipc).fetchComic(id),
      (await ipc).fetchImgList(id),
    ]);

    return {
      comic,
      imgList: sortImgList(imgList),
    };
  },
});
