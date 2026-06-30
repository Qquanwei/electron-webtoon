import HTMLFlipBook from "react-pageflip-rtl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import classNames from "classnames";
import StartUpPage from "../../../startPage";
import useComicContext from "../useComicContext";
import { useFirstElePosition } from "./hooks";
import HorizonProgressPreview from "./HorizonProgressPreview";
import {
  buildHorizonSpreads,
  getSpreadIndexForPage,
  getSpreadProgressIndex,
  pageIndexToSpreadIndex,
  spreadIndexToPageIndex,
} from "./horizonSpreads";
import type { ImgListProps } from "./types";
import { getComicImageClassName } from "./utils";
import styles from "./HorizonReader.module.css";

const FLIP_DURATION_MS = 800;
const WHEEL_THRESHOLD = 48;

type TurnDirection = "forward" | "back";

interface ComicFlipPageProps {
  src: string;
  pageIndex: number;
  filter?: number;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
}

const ComicFlipPage = forwardRef<HTMLDivElement, ComicFlipPageProps>(
  function ComicFlipPage({ src, pageIndex, filter, onLoad }, ref) {
    return (
      <div ref={ref} className={styles.flipPage}>
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          data-index={pageIndex}
          onLoad={onLoad}
          className={getComicImageClassName(filter, styles.flipPageImage)}
        />
      </div>
    );
  },
);

export default function HorizonReader({
  imgList,
  onVisitPosition,
  tag,
}: ImgListProps) {
  const { filter, autoScroll, zoomScale, shortcutHandlersRef } =
    useComicContext();
  const firstElePosition = useFirstElePosition(tag);
  const spreads = useMemo(() => buildHorizonSpreads(imgList), [imgList]);

  const bookRef = useRef<{ pageFlip: () => PageFlipApi } | null>(null);
  const bookAreaRef = useRef<HTMLDivElement>(null);
  const spreadIndexRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelAccumRef = useRef(0);

  const [spreadIndex, setSpreadIndex] = useState(() =>
    getSpreadIndexForPage(spreads, firstElePosition),
  );
  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [bookSize, setBookSize] = useState({ pageWidth: 480, pageHeight: 680 });

  spreadIndexRef.current = spreadIndex;

  interface PageFlipApi {
    flipNext: (corner?: "top" | "bottom") => void;
    flipPrev: (corner?: "top" | "bottom") => void;
    turnToPage: (pageNum: number) => void;
    getCurrentPageIndex: () => number;
  }

  const getPageFlip = useCallback((): PageFlipApi | null => {
    return bookRef.current?.pageFlip?.() ?? null;
  }, []);

  useLayoutEffect(() => {
    const area = bookAreaRef.current;
    if (!area) return undefined;

    const updateSize = () => {
      const { width, height } = area.getBoundingClientRect();
      const pageWidth = Math.max(240, Math.floor(width / 2));
      const pageHeight = Math.max(320, Math.floor(height - 8));
      setBookSize({ pageWidth, pageHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSpreadIndex(getSpreadIndexForPage(spreads, firstElePosition));
  }, [spreads, tag, firstElePosition]);

  const markReady = useCallback(() => {
    setLoading(false);
    window.setTimeout(() => {
      setScrollingDone(true);
    }, 300);
  }, []);

  useEffect(() => {
    setLoading(true);
    setScrollingDone(false);
  }, [imgList]);

  useLayoutEffect(() => {
    const target = document.querySelector<HTMLImageElement>(
      `img.comic-img[data-index="${firstElePosition}"]`,
    );
    if (target?.complete) {
      markReady();
    }
  }, [imgList, firstElePosition, spreadIndex, markReady]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      markReady();
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [imgList, markReady]);

  const onLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      if (Number(event.currentTarget.dataset.index) !== firstElePosition) {
        return;
      }
      markReady();
    },
    [firstElePosition, markReady],
  );

  const syncSpreadFromFlip = useCallback((pageIndex: number) => {
    setSpreadIndex(pageIndexToSpreadIndex(pageIndex));
  }, []);

  const turnPage = useCallback(
    (direction: TurnDirection) => {
      if (animating || wheelLockedRef.current) return;

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      wheelLockedRef.current = true;
      wheelAccumRef.current = 0;

      if (direction === "forward") {
        pageFlip.flipNext("top");
      } else {
        pageFlip.flipPrev("top");
      }

      window.setTimeout(() => {
        wheelLockedRef.current = false;
      }, FLIP_DURATION_MS + 80);
    },
    [animating, getPageFlip],
  );

  const goToSpread = useCallback(
    (index: number) => {
      if (animating || wheelLockedRef.current || index === spreadIndexRef.current) {
        return;
      }

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      wheelLockedRef.current = true;
      wheelAccumRef.current = 0;
      pageFlip.turnToPage(spreadIndexToPageIndex(index));
      syncSpreadFromFlip(spreadIndexToPageIndex(index));

      window.setTimeout(() => {
        wheelLockedRef.current = false;
      }, 200);
    },
    [animating, getPageFlip, syncSpreadFromFlip],
  );

  const turnPageRef = useRef(turnPage);
  turnPageRef.current = turnPage;

  useEffect(() => {
    shortcutHandlersRef.current.turnHorizonPage = (direction) => {
      turnPageRef.current(direction);
    };
    return () => {
      shortcutHandlersRef.current.turnHorizonPage = undefined;
    };
  }, [shortcutHandlersRef]);

  useEffect(() => {
    if (!scrollingDone || !onVisitPosition) return;
    const spread = spreads[spreadIndex];
    if (!spread) return;
    onVisitPosition(getSpreadProgressIndex(spread));
  }, [spreadIndex, scrollingDone, spreads, onVisitPosition]);

  useEffect(() => {
    const pageFlip = getPageFlip();
    if (!pageFlip) return;
    pageFlip.turnToPage(firstElePosition);
    syncSpreadFromFlip(firstElePosition);
  }, [imgList, tag, firstElePosition, getPageFlip, syncSpreadFromFlip]);

  useEffect(() => {
    document.body.classList.add("overflow-y-hidden");
    document.documentElement.classList.add("comic-horizon-reading");

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;
      if ((event.target as Element | null)?.closest?.("[data-horizon-preview]")) {
        return;
      }
      event.preventDefault();
      if (wheelLockedRef.current) return;

      wheelAccumRef.current += event.deltaY;
      if (Math.abs(wheelAccumRef.current) < WHEEL_THRESHOLD) return;

      const direction = wheelAccumRef.current > 0 ? "forward" : "back";
      wheelAccumRef.current = 0;
      turnPageRef.current(direction);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      document.body.classList.remove("overflow-y-hidden");
      document.documentElement.classList.remove("comic-horizon-reading");
    };
  }, []);

  useEffect(() => {
    if (!autoScroll || animating) return undefined;

    const timer = window.setInterval(() => {
      if (wheelLockedRef.current) return;
      const current = spreadIndexRef.current;
      if (current >= spreads.length - 1) return;
      turnPageRef.current("forward");
    }, FLIP_DURATION_MS + 900);

    return () => window.clearInterval(timer);
  }, [autoScroll, animating, spreads.length]);

  const onFlip = useCallback(
    (event: { data: number }) => {
      syncSpreadFromFlip(event.data);
    },
    [syncSpreadFromFlip],
  );

  const onChangeState = useCallback((event: { data: string }) => {
    setAnimating(event.data === "flipping");
  }, []);

  const onInit = useCallback(
    (event: { data: { page: number } }) => {
      syncSpreadFromFlip(event.data.page);
    },
    [syncSpreadFromFlip],
  );

  const bookShellStyle = {
    transform: `scale(${zoomScale})`,
    transformOrigin: "center center",
  } as CSSProperties;

  if (!imgList.length) {
    return <div className={styles.stage} />;
  }

  return (
    <div className={classNames(styles.stage, "comic-horizon-scroll")}>
      <StartUpPage className={classNames("z-10", { "!hidden": !loading })} />
      <div ref={bookAreaRef} className={styles.bookArea}>
        <div className={styles.flipBookShell} style={bookShellStyle}>
          <HTMLFlipBook
            key={`${tag}-${imgList.length}`}
            ref={bookRef}
            className={styles.flipBook}
            style={{}}
            width={bookSize.pageWidth}
            height={bookSize.pageHeight}
            size="stretch"
            minWidth={240}
            maxWidth={bookSize.pageWidth}
            minHeight={320}
            maxHeight={bookSize.pageHeight}
            rtl
            showCover
            usePortrait={false}
            drawShadow
            flippingTime={FLIP_DURATION_MS}
            maxShadowOpacity={0.55}
            showPageCorners
            disableFlipByClick
            useMouseEvents
            mobileScrollSupport={false}
            startPage={firstElePosition}
            startZIndex={0}
            autoSize
            clickEventForward={false}
            swipeDistance={30}
            onFlip={onFlip}
            onChangeState={onChangeState}
            onInit={onInit}
          >
            {imgList.map((src, pageIndex) => (
              <ComicFlipPage
                key={`${tag}-${pageIndex}-${src}`}
                src={src}
                pageIndex={pageIndex}
                filter={filter}
                onLoad={onLoad}
              />
            ))}
          </HTMLFlipBook>
        </div>
      </div>
      <HorizonProgressPreview
        spreads={spreads}
        spreadIndex={spreadIndex}
        animating={animating}
        onSelect={goToSpread}
      />
    </div>
  );
}
