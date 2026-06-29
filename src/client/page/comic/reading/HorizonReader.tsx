import { useMemo, useRef, type CSSProperties } from "react";
import classNames from "classnames";
import StartUpPage from "../../../startPage";
import useComicContext from "../useComicContext";
import {
  useFirstElePosition,
  useHorizontalAutoScroll,
  useHorizontalScrollLock,
  useReadingReadyState,
  useWatchComicPositionChange,
} from "./hooks";
import type { ImgListProps } from "./types";
import { getComicImageClassName } from "./utils";

export default function HorizonReader({
  imgList,
  onVisitPosition,
  tag,
}: ImgListProps) {
  const { filter, autoScroll, zoomScale } = useComicContext();
  const firstElePosition = useFirstElePosition(tag);
  const containerRef = useRef<HTMLDivElement>(null);

  const { loading, scrollingDone, onLoad } = useReadingReadyState(
    imgList,
    firstElePosition,
    containerRef,
  );

  useWatchComicPositionChange(
    imgList,
    !loading && scrollingDone,
    onVisitPosition,
  );
  useHorizontalScrollLock();
  useHorizontalAutoScroll(containerRef, autoScroll);

  const reverseImgList = useMemo(() => [...imgList].reverse(), [imgList]);

  const pageStyle = useMemo(
    () =>
      ({
        "--comic-zoom": zoomScale,
      }) as CSSProperties,
    [zoomScale],
  );

  const imageStyle = useMemo(
    () => ({
      maxHeight: `calc((100vh - 2.5rem) * ${zoomScale})`,
      maxWidth: `calc((100vw - 2rem) * ${zoomScale})`,
    }),
    [zoomScale],
  );

  return (
    <div
      ref={containerRef}
      className="comic-horizon-scroll flex h-[100vh] flex-row overflow-x-scroll overflow-y-hidden border-box bg-white"
      style={pageStyle}
    >
      <StartUpPage className={classNames("z-10", { "!hidden": !loading })} />
      {reverseImgList.map((src, index) => (
        <div
          key={`${tag ?? ""}-${index}-${src}`}
          className="flex h-[100vh] flex-shrink-0 items-center border-x border-box bg-gray-100 px-2 pb-5 pt-3"
        >
          <img
            onLoad={onLoad}
            src={src}
            loading="eager"
            data-index={reverseImgList.length - 1 - index}
            style={imageStyle}
            className={getComicImageClassName(
              filter,
              "my-auto bg-gray-100",
            )}
          />
        </div>
      ))}
    </div>
  );
}
