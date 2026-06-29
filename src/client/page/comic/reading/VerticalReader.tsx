import { useCallback, useLayoutEffect, useRef } from "react";
import classNames from "classnames";
import StartUpPage from "../../../startPage";
import useComicContext from "../useComicContext";
import {
  useAutoNextPage,
  useFirstElePosition,
  useReadingReadyState,
  useVerticalAutoScroll,
  useVerticalScrollLock,
  useWatchComicPositionChange,
} from "./hooks";
import type { ImgListProps } from "./types";
import { getComicImageClassName } from "./utils";

export default function VerticalReader({
  onNextPage,
  hasNextPage,
  imgList,
  onVisitPosition,
  tag,
}: ImgListProps) {
  const { filter, autoScroll } = useComicContext();
  const firstElePosition = useFirstElePosition(tag);
  const scrollContainerRef = useRef<Element | null>(null);

  useLayoutEffect(() => {
    scrollContainerRef.current = document.scrollingElement;
  }, []);

  const { loading, scrollingDone, onLoad } = useReadingReadyState(
    imgList,
    firstElePosition,
    scrollContainerRef,
  );

  useWatchComicPositionChange(
    imgList,
    !loading && scrollingDone,
    onVisitPosition,
  );
  useVerticalScrollLock();
  useVerticalAutoScroll(autoScroll);
  const { triggerRef, countdown } = useAutoNextPage(autoScroll, onNextPage);

  const onClickNextPage = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onNextPage?.();
    },
    [onNextPage],
  );

  return (
    <div className="flex w-full select-none flex-col justify-center text-0">
      <StartUpPage className={classNames("z-10", { "!hidden": !loading })} />
      {imgList.map((src, index) => (
        <img
          key={`${tag ?? ""}-${index}-${src}`}
          src={src}
          onLoad={onLoad}
          data-index={index}
          className={getComicImageClassName(filter, "mx-auto")}
        />
      ))}
      {hasNextPage ? (
        <div
          onClick={onClickNextPage}
          className="mx-auto w-[50px] cursor-pointer py-[20px] text-center text-sky-300 transition transition-all hover:font-bold hover:text-sky-500"
          ref={triggerRef}
        >
          下一页{countdown === 0 ? "" : countdown}
        </div>
      ) : null}
    </div>
  );
}
