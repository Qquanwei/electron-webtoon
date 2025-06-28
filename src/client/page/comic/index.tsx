/* eslint-disable */
import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useRecoilValue, useRecoilRefresher_UNSTABLE } from "recoil";
import SingleComic from "./SingleComic";
import ChapterComic from "./ChapterComic";
import { IComicContext, Provider } from "./useComicContext";
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
  const { imgList, comic } = useRecoilValue(selector.comicDetail(id));
  const refresh = useRecoilRefresher_UNSTABLE(selector.comicDetail(id));

  // 带有章节的漫画
  const isChapterComic = useMemo(() => {
    if (typeof imgList[0] === "string") {
      return false;
    }
    return true;
  }, []);

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
      refreshCurrentComic: refresh,
    };
  }, [autoScroll, setAutoScroll, filter, onClickFilter, comic]);

  return (
    <div className="w-full border-box">
      <Provider value={contextValue}>
        {isChapterComic ? (
          <ChapterComic chapterList={imgList as IImgListForMultipleChapter} />
        ) : (
          <SingleComic imgList={imgList as IImgListForSingleChapter} />
        )}
      </Provider>
    </div>
  );
}

export default ComicPage;
