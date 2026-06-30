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
const WHEEL_GESTURE_START_THRESHOLD = 6;
const WHEEL_GESTURE_GAP_MS = 260;
const WHEEL_TRACKPAD_BLOCK_MS = 520;
const WHEEL_PROGRESS_SENSITIVITY = 0.55;
const WHEEL_MAX_DELTA_Y = 36;
const WHEEL_MAX_PROGRESS_STEP = 12;

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
  targetProgress: number;
  startPos: BookPoint;
  pos: BookPoint;
}

interface WheelGestureGate {
  lastEventAt: number;
  hasTurnedPage: boolean;
  blockedUntil: number;
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

function clampWheelDelta(deltaY: number) {
  return Math.sign(deltaY) * Math.min(Math.abs(deltaY), WHEEL_MAX_DELTA_Y);
}

function clampProgressStep(step: number) {
  return Math.sign(step) * Math.min(Math.abs(step), WHEEL_MAX_PROGRESS_STEP);
}

function readFlipProgress(pageFlip: PageFlipSurface) {
  return pageFlip.getFlipController().getCalculation()?.getFlippingProgress() ?? 0;
}

function syncWheelFoldToProgress(
  pageFlip: PageFlipSurface,
  session: WheelFoldSession,
  bounds: BookBounds,
) {
  if (!session.active || session.direction === null) return;

  const target = session.targetProgress;
  const start = session.startPos;
  const direction = session.direction;
  const dragRange = bounds.pageWidth * 1.85;

  let lo: number;
  let hi: number;
  if (direction === "forward") {
    lo = start.x;
    hi = start.x + dragRange;
  } else {
    lo = start.x - dragRange;
    hi = start.x;
  }

  let bestPos = { x: start.x, y: start.y };
  let bestGap = Number.POSITIVE_INFINITY;

  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    const pos = { x: mid, y: start.y };
    pageFlip.userMove(pos, false);
    const current = readFlipProgress(pageFlip);
    const gap = Math.abs(current - target);

    if (gap < bestGap) {
      bestGap = gap;
      bestPos = pos;
    }

    if (current < target - 0.4) {
      if (direction === "forward") lo = mid;
      else hi = mid;
    } else {
      if (direction === "forward") hi = mid;
      else lo = mid;
    }
  }

  pageFlip.userMove(bestPos, false);
  session.pos = bestPos;
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
    targetProgress: 0,
    startPos: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
  });
  const cornerDragRef = useRef({ active: false, pos: { x: 0, y: 0 } });
  const wheelGestureRef = useRef<WheelGestureGate>({
    lastEventAt: 0,
    hasTurnedPage: false,
    blockedUntil: 0,
  });

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

  const markWheelPageTurn = useCallback(() => {
    const gesture = wheelGestureRef.current;
    gesture.hasTurnedPage = true;
    gesture.blockedUntil = Date.now() + FLIP_DURATION_MS + WHEEL_TRACKPAD_BLOCK_MS;
  }, []);

  const resetWheelFoldSession = useCallback(() => {
    const session = wheelFoldRef.current;
    session.active = false;
    session.direction = null;
    session.targetProgress = 0;
    session.startPos = { x: 0, y: 0 };
    session.pos = { x: 0, y: 0 };
  }, []);

  const finishWheelFold = useCallback(
    (force = false) => {
      const session = wheelFoldRef.current;
      if (!session.active) {
        session.targetProgress = 0;
        session.direction = null;
        return;
      }

      const pageFlip = getPageFlip();
      if (!pageFlip || pageFlip.getState() !== "user_fold") {
        resetWheelFoldSession();
        return;
      }

      if (session.targetProgress >= 100) {
        markWheelPageTurn();
        pageFlip.userStop(session.pos);
        resetWheelFoldSession();
        return;
      }

      if (force || session.targetProgress <= 0) {
        pageFlip.userMove(session.startPos, false);
        pageFlip.userStop(session.startPos);
        resetWheelFoldSession();
      }
    },
    [getPageFlip, markWheelPageTurn, resetWheelFoldSession],
  );

  const applyWheelFoldDelta = useCallback(
    (direction: TurnDirection, deltaY: number) => {
      const pageFlip = getPageFlip();
      const state = pageFlip?.getState();
      if (!pageFlip || state === "flipping") {
        return;
      }

      const bounds = pageFlip.getBoundsRect();
      const session = wheelFoldRef.current;
      let signedDelta = clampProgressStep(
        clampWheelDelta(deltaY) *
          WHEEL_PROGRESS_SENSITIVITY *
          (direction === "forward" ? 1 : -1),
      );

      if (session.active && session.direction !== direction) {
        finishWheelFold(true);
        if (pageFlip.getState() === "flipping") {
          return;
        }
      }

      if (pageFlip.getState() !== "read" && !session.active) {
        return;
      }

      if (!session.active) {
        if (session.direction !== direction) {
          session.direction = direction;
          session.targetProgress = 0;
        }

        session.targetProgress = Math.min(
          100,
          Math.max(0, session.targetProgress + signedDelta),
        );

        if (session.targetProgress < WHEEL_GESTURE_START_THRESHOLD) {
          return;
        }

        session.startPos = getWheelCornerStart(direction, bounds);
        session.active = true;
        pageFlip.startUserTouch(session.startPos);
      } else {
        const nextProgress = Math.min(
          100,
          Math.max(0, session.targetProgress + signedDelta),
        );
        if (nextProgress >= 100 && session.targetProgress < 100) {
          signedDelta = 100 - session.targetProgress;
        } else if (nextProgress <= 0 && session.targetProgress > 0) {
          signedDelta = -session.targetProgress;
        }
        session.targetProgress = Math.min(
          100,
          Math.max(0, session.targetProgress + signedDelta),
        );
      }

      syncWheelFoldToProgress(pageFlip, session, bounds);

      if (session.targetProgress <= 0 || session.targetProgress >= 100) {
        finishWheelFold();
        return;
      }
    },
    [
      finishWheelFold,
      getPageFlip,
      getWheelCornerStart,
    ],
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

      finishWheelFold(true);

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

      finishWheelFold(true);

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

      const now = Date.now();
      const gesture = wheelGestureRef.current;

      if (now - gesture.lastEventAt > WHEEL_GESTURE_GAP_MS) {
        if (now >= gesture.blockedUntil) {
          gesture.hasTurnedPage = false;
        }
      }
      gesture.lastEventAt = now;

      if (gesture.hasTurnedPage || now < gesture.blockedUntil) {
        return;
      }

      const direction: TurnDirection = event.deltaY > 0 ? "forward" : "back";
      applyWheelFoldDelta(direction, event.deltaY);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      finishWheelFold(true);
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

      finishWheelFold(true);
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
        const gesture = wheelGestureRef.current;
        gesture.blockedUntil = Math.max(
          gesture.blockedUntil,
          Date.now() + WHEEL_TRACKPAD_BLOCK_MS,
        );
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
