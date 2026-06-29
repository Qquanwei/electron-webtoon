import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useRecoilValue, useRecoilRefresher_UNSTABLE } from "recoil";
import SingleComic from "./SingleComic";
import ChapterComic from "./ChapterComic";
import { IComicContext, Provider } from "./useComicContext";
import useComicShortcuts from "./useComicShortcuts";
import { useComicZoomState, useComicZoomWheel } from "./useComicZoom";
import * as selector from "../../selector";
import {
  IImgListForMultipleChapter,
  IImgListForSingleChapter,
} from "@shared/type";

// 一共有两种类型的漫画，一种是无章节，一种有章节，需要分开对待
function ComicPage() {
  const { id } = useParams<{ id: string }>();
  const [autoScroll, setAutoScroll] = useState(false);
  const [filter, setFilter] = useState(0);
  const shortcutHandlersRef = useRef<IComicContext["shortcutHandlersRef"]["current"]>({});
  const { imgList, comic } = useRecoilValue(selector.comicDetail(id));
  const refresh = useRecoilRefresher_UNSTABLE(selector.comicDetail(id));
  const { zoomScale, setZoomScale } = useComicZoomState(comic);

  // 带有章节的漫画
  const isChapterComic = useMemo(() => {
    if (!imgList.length) return false;
    return typeof imgList[0] !== "string";
  }, [imgList]);

  useEffect(() => {
    return refresh;
  }, [refresh]);

  const onClickFilter = useCallback(
    (index) => {
      if (filter === index) {
        setFilter(0);
      } else {
        setFilter(index);
      }
    },
    [filter],
  );

  const contextValue = useMemo<IComicContext>(() => {
    return {
      autoScroll,
      setAutoScroll,
      filter,
      onClickFilter,
      comic,
      zoomScale,
      setZoomScale,
      refreshCurrentComic: refresh,
      shortcutHandlersRef,
    };
  }, [autoScroll, filter, onClickFilter, comic, zoomScale, setZoomScale, refresh]);

  return (
    <div className="w-full border-box">
      <Provider value={contextValue}>
        <ComicShortcutListener />
        <ComicZoomListener />
        {isChapterComic ? (
          <ChapterComic chapterList={imgList as IImgListForMultipleChapter} />
        ) : (
          <SingleComic imgList={imgList as IImgListForSingleChapter} />
        )}
      </Provider>
    </div>
  );
}

function ComicShortcutListener() {
  useComicShortcuts();
  return null;
}

function ComicZoomListener() {
  useComicZoomWheel();
  return null;
}

export default ComicPage;
