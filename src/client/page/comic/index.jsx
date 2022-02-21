/* eslint-disable */
import React, {
  useCallback, useEffect, useState,
  useLayoutEffect, Fragment, useRef, useMemo } from 'react';
import { useParams, Link, useHistory } from 'react-router-dom';
import Container from '@material-ui/core/Container';
import classNames from 'classnames';
import { withLocalRecoilRoot, arrayDeep } from '../../utils';
import { useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import SingleComic from './SingleComic';
import ChapterComic from './ChapterComic';
import useComicContext from './useComicContext';
import { Provider }  from './useComicContext';
import ipc from '../../ipc';
import * as selector from '../../selector';

import styles from './index.css';

import {
  GridList,
  GridListTile,
  GridListTileBar,
  Menu,
  MenuItem
} from '@material-ui/core';

// 一共有两种类型的漫画，一种是无章节，一种有章节，需要分开对待
function ComicPage({ history }) {
  const { id } = useParams();
  const [autoScroll, setAutoScroll] = useState(false);
  const [filter, setFilter] = useState(0);
  const { imgList, comic } = useRecoilValue(selector.comicDetail(id));
  const refresh = useRecoilRefresher_UNSTABLE(selector.comicDetail(id));

  // 带有章节的漫画
  const isChapterComic = useMemo(() => {
    return !!imgList[0].name;
  }, []);

  useEffect(() => {
    return refresh;
  }, [refresh]);

  const onClickFilter = useCallback((index) => {
    if (filter === index) {
      setFilter(0);
    } else {
      setFilter(index);
    }
  }, [filter]);

  const onNextPage = useCallback(() => {
    setChapter(chapter => {
      let index = -1;
      for (let i = 0; i < imgList[0].list.length; ++i) {
        if (imgList[0].list[i].name === chapter.name) {
          index = i;
          break;
        }
      }
      const newChapter = imgList[0].list[index + 1];
      ipc.then(i => {
        i.saveComicTag(comic.id, newChapter.name);
      });

      return newChapter;

    });
  }, [imgList, comic]);

  const contextValue = useMemo(() => {
    return {
      autoScroll,
      setAutoScroll,
      filter,
      onClickFilter,
      comic
    };
  }, [autoScroll, setAutoScroll, filter, onClickFilter, comic]);

  return (
    <div className={styles.container}>
      <Provider value={contextValue}>
        {
          isChapterComic ? (
            <ChapterComic chapterList={imgList} />
          ) : (
            <SingleComic imgList={imgList} />
          )
        }
      </Provider>
    </div>
  );
}

export default withLocalRecoilRoot(ComicPage);
