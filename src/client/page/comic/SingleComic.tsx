/* eslint-disable */
import React, { useCallback } from "react";
import useComicContext from "./useComicContext";
import ImgList from "./imgList";
import ImgControl from "./ImgControl";
import { IImgListForSingleChapter } from "@shared/type";
import { getIPC } from "@client/ipc";

const SingleComic: React.FC<{ imgList: IImgListForSingleChapter }> = ({
  imgList,
}) => {
  const { comic } = useComicContext();

  const onVisitPositionChange = useCallback(
    async (position) => {
      const ipc = await getIPC();
      if (comic) {
        ipc.saveComicTag(comic.id, "", position);
      }
    },
    [comic],
  );

  return (
    <>
      <ImgList
        imgList={imgList}
        hasNextPage={false}
        onVisitPosition={onVisitPositionChange}
      />
      <ImgControl />
    </>
  );
};

export default SingleComic;
