import { useCallback, useLayoutEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import classNames from "classnames";
import StartUpPage from "../../../startPage";
import useComicContext from "../useComicContext";
import {
  useAutoNextPage,
  useFirstElePosition,
  useReadingReadyState,
  useVerticalAutoScroll,
  useVerticalReadingEnvironment,
  useWatchComicPositionChange,
} from "./hooks";
import type { ImgListProps } from "./types";
import { getComicImageClassName } from "./utils";
import styles from "./VerticalReader.module.css";

export default function VerticalReader({
  onNextPage,
  hasNextPage,
  imgList,
  onVisitPosition,
  tag,
}: ImgListProps) {
  const { filter, autoScroll, zoomScale } = useComicContext();
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
  useVerticalReadingEnvironment(zoomScale > 1.001);
  useVerticalAutoScroll(autoScroll);
  const { triggerRef, countdown } = useAutoNextPage(autoScroll, onNextPage);

  const onClickNextPage = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onNextPage?.();
    },
    [onNextPage],
  );

  return (
    <>
      <div className={styles.ambient} aria-hidden />
      <div
        className={styles.reader}
        style={{ "--comic-zoom": zoomScale } as CSSProperties}
      >
        <StartUpPage className={classNames("z-10", { "!hidden": !loading })} />
        {imgList.map((src, index) => (
          <div key={`${tag ?? ""}-${index}-${src}`} className={styles.page}>
            <div className={styles.pageFrame}>
              <img
                src={src}
                onLoad={onLoad}
                data-index={index}
                className={getComicImageClassName(
                  filter,
                  styles.pageImage,
                )}
              />
            </div>
          </div>
        ))}
        {hasNextPage ? (
          <div
            onClick={onClickNextPage}
            className={styles.nextChapter}
            ref={triggerRef}
          >
            下一页
            {countdown === 0 ? null : (
              <span className={styles.nextChapterCount}>{countdown}</span>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
