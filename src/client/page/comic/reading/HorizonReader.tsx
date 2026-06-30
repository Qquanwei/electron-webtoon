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

const FLIP_DURATION_MS = 750;
const CLICK_TURN_THRESHOLD = 8;

type TurnDirection = "forward" | "back";

interface BookPoint {
  x: number;
  y: number;
}

interface BookBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  pageWidth: number;
}

interface PageFlipSurface {
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  turnToPage: (pageNum: number) => void;
  getCurrentPageIndex: () => number;
  getBoundsRect: () => BookBounds;
  getState: () => string;
  update: () => void;
  startUserTouch: (pos: BookPoint) => void;
  userMove: (pos: BookPoint, isTouch: boolean) => void;
  userStop: (pos: BookPoint, isSwipe?: boolean) => void;
}

function getDistPos(
  clientX: number,
  clientY: number,
  distEl: HTMLElement,
): BookPoint {
  const rect = distEl.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function isWithinBook(distPos: BookPoint, bounds: BookBounds): boolean {
  const bookX = distPos.x - bounds.left;
  const bookY = distPos.y - bounds.top;
  return (
    bookX > 0 && bookY > 0 && bookX < bounds.width && bookY < bounds.height
  );
}

function getBookHalf(
  distPos: BookPoint,
  bounds: BookBounds,
): TurnDirection | null {
  if (!isWithinBook(distPos, bounds)) {
    return null;
  }

  const bookX = distPos.x - bounds.left;
  return bookX <= bounds.width / 2 ? "forward" : "back";
}

function constrainCornerDragPos(
  pos: BookPoint,
  startPos: BookPoint,
  bounds: BookBounds,
): BookPoint {
  const startBookX = startPos.x - bounds.left;
  const midX = bounds.width / 2;
  let x = pos.x;

  if (startBookX <= midX) {
    x = Math.max(startPos.x, pos.x);
  } else {
    x = Math.min(startPos.x, pos.x);
  }

  return { x, y: startPos.y };
}

function getClickTurnDirection(
  distPos: BookPoint,
  bounds: BookBounds,
): TurnDirection | null {
  return getBookHalf(distPos, bounds);
}

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

  const bookRef = useRef<{ pageFlip: () => PageFlipSurface } | null>(null);
  const bookAreaRef = useRef<HTMLDivElement>(null);
  const spreadIndexRef = useRef(0);
  const cornerDragRef = useRef({
    active: false,
    pos: { x: 0, y: 0 },
    startPos: { x: 0, y: 0 },
  });
  const pointerGestureRef = useRef({
    down: false,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const prevFlipStateRef = useRef("read");
  const pendingPageIndexRef = useRef<number | null>(null);

  const [spreadIndex, setSpreadIndex] = useState(() =>
    getSpreadIndexForPage(spreads, firstElePosition),
  );
  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [bookSize, setBookSize] = useState<{
    pageWidth: number;
    pageHeight: number;
  } | null>(null);

  spreadIndexRef.current = spreadIndex;

  const getPageFlip = useCallback((): PageFlipSurface | null => {
    return bookRef.current?.pageFlip?.() ?? null;
  }, []);

  const releaseActiveFold = useCallback(
    (pageFlip: PageFlipSurface, pos: BookPoint) => {
      if (pageFlip.getState() !== "user_fold") return;
      pageFlip.userStop(pos);
    },
    [],
  );

  useLayoutEffect(() => {
    const area = bookAreaRef.current;
    if (!area) return undefined;

    const updateSize = () => {
      const { width, height } = area.getBoundingClientRect();
      if (width < 120 || height < 120) return;

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
      if (animating) return;

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      if (direction === "forward") {
        pageFlip.flipNext("bottom");
      } else {
        pageFlip.flipPrev("top");
      }
    },
    [animating, getPageFlip],
  );

  const goToSpread = useCallback(
    (index: number) => {
      if (animating || index === spreadIndexRef.current) {
        return;
      }

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      pageFlip.turnToPage(spreadIndexToPageIndex(index));
      syncSpreadFromFlip(spreadIndexToPageIndex(index));
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

  useLayoutEffect(() => {
    const pageFlip = getPageFlip();
    if (!pageFlip || !bookSize) return;
    pageFlip.update();
  }, [bookSize, getPageFlip]);

  useEffect(() => {
    document.body.classList.add("overflow-y-hidden");
    document.documentElement.classList.add("comic-horizon-reading");

    return () => {
      document.body.classList.remove("overflow-y-hidden");
      document.documentElement.classList.remove("comic-horizon-reading");
    };
  }, []);

  useEffect(() => {
    const area = bookAreaRef.current;
    if (!area || loading) return undefined;

    function getDistElement() {
      return area.querySelector<HTMLElement>(".stf__block");
    }

    function resetPointerGesture() {
      pointerGestureRef.current.down = false;
      pointerGestureRef.current.moved = false;
    }

    function markPointerMoved(clientX: number, clientY: number) {
      if (!pointerGestureRef.current.down || pointerGestureRef.current.moved) {
        return;
      }

      const dx = clientX - pointerGestureRef.current.startX;
      const dy = clientY - pointerGestureRef.current.startY;
      if (Math.hypot(dx, dy) >= CLICK_TURN_THRESHOLD) {
        pointerGestureRef.current.moved = true;
      }
    }

    function cancelCornerDragFold() {
      if (!cornerDragRef.current.active) {
        return;
      }

      const pageFlip = getPageFlip();
      if (pageFlip?.getState() === "user_fold") {
        const { startPos } = cornerDragRef.current;
        pageFlip.userMove(startPos, false);
        pageFlip.userStop(startPos);
      }
      cornerDragRef.current.active = false;
    }

    function tryClickTurn(clientX: number, clientY: number) {
      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl || pageFlip.getState() === "flipping") {
        return;
      }

      const bounds = pageFlip.getBoundsRect();
      const direction = getClickTurnDirection(
        getDistPos(clientX, clientY, distEl),
        bounds,
      );
      if (!direction) {
        return;
      }

      cancelCornerDragFold();
      turnPageRef.current(direction);
    }

    function beginCornerDrag(clientX: number, clientY: number, target: EventTarget | null) {
      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl || pageFlip.getState() === "flipping") return;
      if (target && !distEl.contains(target as Node)) return;

      const bounds = pageFlip.getBoundsRect();
      const pos = getDistPos(clientX, clientY, distEl);
      if (!getBookHalf(pos, bounds)) return;

      pageFlip.startUserTouch(pos);
      cornerDragRef.current = { active: true, pos, startPos: { ...pos } };
    }

    function moveCornerDrag(clientX: number, clientY: number) {
      if (!cornerDragRef.current.active) return;

      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl) return;

      const bounds = pageFlip.getBoundsRect();
      const raw = getDistPos(clientX, clientY, distEl);
      const pos = constrainCornerDragPos(
        raw,
        cornerDragRef.current.startPos,
        bounds,
      );
      cornerDragRef.current.pos = pos;
      pageFlip.userMove(pos, false);
    }

    function endCornerDrag() {
      if (!cornerDragRef.current.active) return;

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      const { pos } = cornerDragRef.current;
      cornerDragRef.current.active = false;
      releaseActiveFold(pageFlip, pos);
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;

      pointerGestureRef.current = {
        down: true,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };

      beginCornerDrag(event.clientX, event.clientY, event.target);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onMouseMove(event: MouseEvent) {
      markPointerMoved(event.clientX, event.clientY);
      moveCornerDrag(event.clientX, event.clientY);
    }

    function onMouseUp(event: MouseEvent) {
      if (pointerGestureRef.current.down && !pointerGestureRef.current.moved) {
        tryClickTurn(event.clientX, event.clientY);
        resetPointerGesture();
        return;
      }

      endCornerDrag();
      resetPointerGesture();
    }

    function onTouchStart(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];

      pointerGestureRef.current = {
        down: true,
        startX: touch.clientX,
        startY: touch.clientY,
        moved: false,
      };

      beginCornerDrag(touch.clientX, touch.clientY, event.target);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      markPointerMoved(touch.clientX, touch.clientY);
      moveCornerDrag(touch.clientX, touch.clientY);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];

      if (pointerGestureRef.current.down && !pointerGestureRef.current.moved) {
        tryClickTurn(touch.clientX, touch.clientY);
        resetPointerGesture();
        return;
      }

      endCornerDrag();
      resetPointerGesture();
    }

    area.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    area.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      area.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      area.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      cornerDragRef.current.active = false;
      resetPointerGesture();
    };
  }, [getPageFlip, loading, releaseActiveFold]);

  useEffect(() => {
    if (!autoScroll || animating) return undefined;

    const timer = window.setInterval(() => {
      if (animating) return;
      const current = spreadIndexRef.current;
      if (current >= spreads.length - 1) return;
      turnPageRef.current("forward");
    }, FLIP_DURATION_MS + 900);

    return () => window.clearInterval(timer);
  }, [autoScroll, animating, spreads.length]);

  const onFlip = useCallback((event: { data: number }) => {
    pendingPageIndexRef.current = event.data;
  }, []);

  const onChangeState = useCallback(
    (event: { data: string }) => {
      const prevState = prevFlipStateRef.current;
      prevFlipStateRef.current = event.data;

      if (event.data === "read" && prevState === "flipping") {
        // 等翻页动画完全收尾后再更新 React，避免 updateFromHtml 打断 99%→100%
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setAnimating(false);
            const pageFlip = getPageFlip();
            const page =
              pendingPageIndexRef.current ?? pageFlip?.getCurrentPageIndex();
            if (page != null) {
              syncSpreadFromFlip(page);
            }
            pendingPageIndexRef.current = null;
          });
        });
        return;
      }

      setAnimating(event.data === "flipping");
    },
    [getPageFlip, syncSpreadFromFlip],
  );

  const flipBookPages = useMemo(
    () =>
      imgList.map((src, pageIndex) => (
        <ComicFlipPage
          key={`${tag}-${pageIndex}-${src}`}
          src={src}
          pageIndex={pageIndex}
          filter={filter}
          onLoad={onLoad}
        />
      )),
    [imgList, tag, filter, onLoad],
  );

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
          {bookSize ? (
            <HTMLFlipBook
              key={`${tag}-${imgList.length}-${bookSize.pageWidth}-${bookSize.pageHeight}`}
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
              showPageCorners={false}
              disableFlipByClick
              useMouseEvents={false}
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
              {flipBookPages}
            </HTMLFlipBook>
          ) : null}
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
