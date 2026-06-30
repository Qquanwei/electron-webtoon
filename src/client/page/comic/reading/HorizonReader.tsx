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
const WHEEL_FOLD_IDLE_MS = 400;
const WHEEL_GESTURE_START_THRESHOLD = 24;
const WHEEL_DELTA_FOR_FULL_FLIP = 280;
const WHEEL_FOLD_COMMIT_PROGRESS = 38;

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
  getFlipController: () => {
    getCalculation: () => { getFlippingProgress: () => number } | null;
  };
  startUserTouch: (pos: BookPoint) => void;
  userMove: (pos: BookPoint, isTouch: boolean) => void;
  userStop: (pos: BookPoint, isSwipe?: boolean) => void;
}

interface WheelFoldSession {
  active: boolean;
  direction: TurnDirection | null;
  accumulated: number;
  startPos: BookPoint;
  pos: BookPoint;
  idleTimer: number | null;
}

function getDistPos(
  clientX: number,
  clientY: number,
  distEl: HTMLElement,
): BookPoint {
  const rect = distEl.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function isBookEdgeOrCorner(distPos: BookPoint, bounds: BookBounds) {
  const bookPos = {
    x: distPos.x - bounds.left,
    y: distPos.y - bounds.top,
  };
  const edgeReach = bounds.pageWidth / 5;

  if (
    bookPos.x <= 0 ||
    bookPos.y <= 0 ||
    bookPos.x >= bounds.width ||
    bookPos.y >= bounds.height
  ) {
    return false;
  }

  return bookPos.x <= edgeReach || bookPos.x >= bounds.width - edgeReach;
}

function getWheelDragProgress(
  accumulated: number,
  direction: TurnDirection,
) {
  const signed = direction === "forward" ? accumulated : -accumulated;
  return Math.max(0, Math.min(1, signed / WHEEL_DELTA_FOR_FULL_FLIP));
}

function getPosForWheelProgress(
  start: BookPoint,
  bounds: BookBounds,
  direction: TurnDirection,
  progress: number,
): BookPoint {
  const span = bounds.pageWidth * 0.92;
  if (direction === "forward") {
    return { x: start.x + progress * span, y: start.y };
  }
  return { x: start.x - progress * span, y: start.y };
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
  const wheelFoldRef = useRef<WheelFoldSession>({
    active: false,
    direction: null,
    accumulated: 0,
    startPos: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
    idleTimer: null,
  });
  const cornerDragRef = useRef({ active: false, pos: { x: 0, y: 0 } });

  const [spreadIndex, setSpreadIndex] = useState(() =>
    getSpreadIndexForPage(spreads, firstElePosition),
  );
  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [bookSize, setBookSize] = useState({ pageWidth: 480, pageHeight: 680 });

  spreadIndexRef.current = spreadIndex;

  const getPageFlip = useCallback((): PageFlipSurface | null => {
    return bookRef.current?.pageFlip?.() ?? null;
  }, []);

  const getWheelCornerStart = useCallback(
    (direction: TurnDirection, bounds: BookBounds): BookPoint => {
      if (direction === "forward") {
        return { x: bounds.left + 10, y: bounds.top + 1 };
      }
      return { x: bounds.left + bounds.width - 10, y: bounds.top + 1 };
    },
    [],
  );

  const resetWheelFoldSession = useCallback(() => {
    const session = wheelFoldRef.current;
    if (session.idleTimer !== null) {
      window.clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }
    session.active = false;
    session.direction = null;
    session.accumulated = 0;
    session.startPos = { x: 0, y: 0 };
    session.pos = { x: 0, y: 0 };
  }, []);

  const finishWheelFold = useCallback(() => {
    const session = wheelFoldRef.current;
    if (session.idleTimer !== null) {
      window.clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }
    if (!session.active) {
      session.accumulated = 0;
      session.direction = null;
      return;
    }

    const pageFlip = getPageFlip();
    if (pageFlip && pageFlip.getState() === "user_fold") {
      const progress =
        pageFlip.getFlipController().getCalculation()?.getFlippingProgress() ??
        0;

      if (progress >= WHEEL_FOLD_COMMIT_PROGRESS) {
        pageFlip.userStop(session.pos);
      } else {
        pageFlip.userMove(session.startPos, false);
        pageFlip.userStop(session.startPos);
      }
    }

    resetWheelFoldSession();
  }, [getPageFlip, resetWheelFoldSession]);

  const applyWheelFoldDelta = useCallback(
    (direction: TurnDirection, deltaY: number) => {
      const pageFlip = getPageFlip();
      const state = pageFlip?.getState();
      if (!pageFlip || state === "flipping") return;

      const bounds = pageFlip.getBoundsRect();
      const session = wheelFoldRef.current;

      if (session.active && session.direction !== direction) {
        finishWheelFold();
        return;
      }

      if (!session.active) {
        if (session.direction && session.direction !== direction) {
          session.accumulated = 0;
        }
        session.direction = direction;
        session.accumulated += deltaY;

        if (Math.abs(session.accumulated) < WHEEL_GESTURE_START_THRESHOLD) {
          return;
        }

        session.startPos = getWheelCornerStart(direction, bounds);
        session.active = true;
        pageFlip.startUserTouch(session.startPos);
      } else {
        session.accumulated += deltaY;
      }

      const progress = getWheelDragProgress(
        session.accumulated,
        session.direction!,
      );
      session.pos = getPosForWheelProgress(
        session.startPos,
        bounds,
        session.direction!,
        progress,
      );

      pageFlip.userMove(session.pos, false);

      if (session.idleTimer !== null) {
        window.clearTimeout(session.idleTimer);
      }
      session.idleTimer = window.setTimeout(() => {
        session.idleTimer = null;
        finishWheelFold();
      }, WHEEL_FOLD_IDLE_MS);
    },
    [finishWheelFold, getPageFlip, getWheelCornerStart],
  );

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
      if (animating) return;

      finishWheelFold();

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      if (direction === "forward") {
        pageFlip.flipNext("top");
      } else {
        pageFlip.flipPrev("top");
      }
    },
    [animating, finishWheelFold, getPageFlip],
  );

  const goToSpread = useCallback(
    (index: number) => {
      if (animating || index === spreadIndexRef.current) {
        return;
      }

      finishWheelFold();

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      pageFlip.turnToPage(spreadIndexToPageIndex(index));
      syncSpreadFromFlip(spreadIndexToPageIndex(index));
    },
    [animating, finishWheelFold, getPageFlip, syncSpreadFromFlip],
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

      const direction: TurnDirection = event.deltaY > 0 ? "forward" : "back";
      applyWheelFoldDelta(direction, event.deltaY);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      finishWheelFold();
      document.body.classList.remove("overflow-y-hidden");
      document.documentElement.classList.remove("comic-horizon-reading");
    };
  }, [applyWheelFoldDelta, finishWheelFold]);

  useEffect(() => {
    const area = bookAreaRef.current;
    if (!area || loading) return undefined;

    function getDistElement() {
      return area.querySelector<HTMLElement>(".stf__block");
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;

      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl || pageFlip.getState() === "flipping") return;
      if (!distEl.contains(event.target as Node)) return;

      const bounds = pageFlip.getBoundsRect();
      const pos = getDistPos(event.clientX, event.clientY, distEl);
      if (!isBookEdgeOrCorner(pos, bounds)) return;

      finishWheelFold();
      pageFlip.startUserTouch(pos);
      cornerDragRef.current = { active: true, pos };
      event.preventDefault();
    }

    function onMouseMove(event: MouseEvent) {
      if (!cornerDragRef.current.active) return;

      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl) return;

      const pos = getDistPos(event.clientX, event.clientY, distEl);
      cornerDragRef.current.pos = pos;
      pageFlip.userMove(pos, false);
    }

    function onMouseUp(event: MouseEvent) {
      if (!cornerDragRef.current.active) return;

      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl) return;

      const pos = getDistPos(event.clientX, event.clientY, distEl);
      pageFlip.userStop(pos);
      cornerDragRef.current.active = false;
    }

    area.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      area.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      cornerDragRef.current.active = false;
    };
  }, [finishWheelFold, getPageFlip, loading]);

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

  const onFlip = useCallback(
    (event: { data: number }) => {
      syncSpreadFromFlip(event.data);
    },
    [syncSpreadFromFlip],
  );

  const onChangeState = useCallback(
    (event: { data: string }) => {
      setAnimating(event.data === "flipping");
      if (event.data === "read") {
        resetWheelFoldSession();
      }
    },
    [resetWheelFoldSession],
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
