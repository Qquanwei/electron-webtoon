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
const WHEEL_GESTURE_START_THRESHOLD = 8;
const WHEEL_GESTURE_GAP_MS = 260;
const WHEEL_TURN_THROTTLE_MS = 520;
const WHEEL_FOLD_IDLE_MS = 100;
const WHEEL_DRAG_SENSITIVITY = 2.4;
const WHEEL_MAX_DELTA_Y = 48;
const FLIP_COMMIT_PROGRESS = 45;

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
  pendingDelta: number;
  startPos: BookPoint;
  pos: BookPoint;
  idleTimer: number | null;
}

interface WheelGestureGate {
  lastEventAt: number;
  hasTurnedPage: boolean;
  /** 节流：上次翻页动画结束后，下一次允许翻页的最早时间 */
  nextTurnAllowedAt: number;
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

function readFlipProgress(pageFlip: PageFlipSurface) {
  return pageFlip.getFlipController().getCalculation()?.getFlippingProgress() ?? 0;
}

function constrainCornerDragPos(
  pos: BookPoint,
  startPos: BookPoint,
  bounds: BookBounds,
): BookPoint {
  const edgeReach = bounds.pageWidth / 5;
  const startBookX = startPos.x - bounds.left;
  let x = pos.x;

  if (startBookX <= edgeReach) {
    x = Math.max(startPos.x, pos.x);
  } else if (startBookX >= bounds.width - edgeReach) {
    x = Math.min(startPos.x, pos.x);
  }

  return { x, y: startPos.y };
}

function getDragDirection(startPos: BookPoint, bounds: BookBounds): TurnDirection {
  const startBookX = startPos.x - bounds.left;
  return startBookX <= bounds.pageWidth / 5 ? "forward" : "back";
}

function getWheelDragBounds(
  direction: TurnDirection,
  start: BookPoint,
  bounds: BookBounds,
) {
  const span = bounds.pageWidth * 1.9;
  if (direction === "forward") {
    return { minX: start.x, maxX: start.x + span };
  }
  return { minX: start.x - span, maxX: start.x };
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
    pendingDelta: 0,
    startPos: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
    idleTimer: null,
  });
  const cornerDragRef = useRef({
    active: false,
    pos: { x: 0, y: 0 },
    startPos: { x: 0, y: 0 },
  });
  const wheelGestureRef = useRef<WheelGestureGate>({
    lastEventAt: 0,
    hasTurnedPage: false,
    nextTurnAllowedAt: 0,
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

  const getWheelCornerStart = useCallback(
    (direction: TurnDirection, bounds: BookBounds): BookPoint => {
      if (direction === "forward") {
        return { x: bounds.left + 10, y: bounds.top + bounds.height - 2 };
      }
      return { x: bounds.left + bounds.width - 10, y: bounds.top + 1 };
    },
    [],
  );

  const markWheelPageTurn = useCallback(() => {
    wheelGestureRef.current.hasTurnedPage = true;
  }, []);

  const cancelWheelIdle = useCallback(() => {
    const session = wheelFoldRef.current;
    if (session.idleTimer !== null) {
      window.clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }
  }, []);

  const resetWheelFoldSession = useCallback(() => {
    const session = wheelFoldRef.current;
    cancelWheelIdle();
    session.active = false;
    session.direction = null;
    session.pendingDelta = 0;
    session.startPos = { x: 0, y: 0 };
    session.pos = { x: 0, y: 0 };
  }, [cancelWheelIdle]);

  /** 松手/停滚：交给 StPageFlip 完成/回弹，避免多余 userMove 造成帧间跳动 */
  const releaseActiveFold = useCallback(
    (
      pageFlip: PageFlipSurface,
      pos: BookPoint,
      _direction: TurnDirection,
    ) => {
      if (pageFlip.getState() !== "user_fold") return;

      const progress = readFlipProgress(pageFlip);
      if (progress >= FLIP_COMMIT_PROGRESS) {
        markWheelPageTurn();
      }

      pageFlip.userStop(pos);
    },
    [markWheelPageTurn],
  );

  const releaseWheelFold = useCallback(
    (options?: { cancel?: boolean }) => {
      const session = wheelFoldRef.current;
      cancelWheelIdle();

      if (!session.active) {
        session.pendingDelta = 0;
        return;
      }

      const pageFlip = getPageFlip();
      if (!pageFlip || pageFlip.getState() !== "user_fold") {
        resetWheelFoldSession();
        return;
      }

      if (options?.cancel) {
        pageFlip.userMove(session.startPos, false);
        pageFlip.userStop(session.startPos);
      } else if (session.direction) {
        releaseActiveFold(pageFlip, session.pos, session.direction);
      }

      resetWheelFoldSession();
    },
    [cancelWheelIdle, getPageFlip, releaseActiveFold, resetWheelFoldSession],
  );

  const scheduleWheelRelease = useCallback(() => {
    const session = wheelFoldRef.current;
    cancelWheelIdle();
    session.idleTimer = window.setTimeout(() => {
      session.idleTimer = null;
      releaseWheelFold();
    }, WHEEL_FOLD_IDLE_MS);
  }, [cancelWheelIdle, releaseWheelFold]);

  const applyWheelFoldDelta = useCallback(
    (direction: TurnDirection, deltaY: number) => {
      const pageFlip = getPageFlip();
      if (!pageFlip || pageFlip.getState() === "flipping") {
        return;
      }

      const bounds = pageFlip.getBoundsRect();
      const session = wheelFoldRef.current;
      const signedDelta =
        clampWheelDelta(deltaY) *
        WHEEL_DRAG_SENSITIVITY *
        (direction === "forward" ? 1 : -1);

      if (session.active && session.direction !== direction) {
        releaseWheelFold({ cancel: true });
        if (pageFlip.getState() === "flipping") return;
      }

      if (pageFlip.getState() !== "read" && !session.active) {
        return;
      }

      if (!session.active) {
        if (session.direction !== direction) {
          session.direction = direction;
          session.pendingDelta = 0;
        }

        session.pendingDelta += signedDelta;
        if (Math.abs(session.pendingDelta) < WHEEL_GESTURE_START_THRESHOLD) {
          return;
        }

        session.startPos = getWheelCornerStart(direction, bounds);
        session.pos = { ...session.startPos };
        session.active = true;
        pageFlip.startUserTouch(session.pos);

        const dragBounds = getWheelDragBounds(
          session.direction,
          session.startPos,
          bounds,
        );
        session.pos = {
          x: Math.min(
            dragBounds.maxX,
            Math.max(dragBounds.minX, session.startPos.x + session.pendingDelta),
          ),
          y: session.startPos.y,
        };
        session.pendingDelta = 0;
        pageFlip.userMove(session.pos, false);
        scheduleWheelRelease();
        return;
      }

      const dragBounds = getWheelDragBounds(
        session.direction!,
        session.startPos,
        bounds,
      );
      session.pos = {
        x: Math.min(
          dragBounds.maxX,
          Math.max(dragBounds.minX, session.pos.x + signedDelta),
        ),
        y: session.startPos.y,
      };

      pageFlip.userMove(session.pos, false);
      scheduleWheelRelease();
    },
    [
      getPageFlip,
      getWheelCornerStart,
      releaseWheelFold,
      scheduleWheelRelease,
    ],
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

      releaseWheelFold({ cancel: true });

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      if (direction === "forward") {
        pageFlip.flipNext("bottom");
      } else {
        pageFlip.flipPrev("top");
      }
    },
    [animating, releaseWheelFold, getPageFlip],
  );

  const goToSpread = useCallback(
    (index: number) => {
      if (animating || index === spreadIndexRef.current) {
        return;
      }

      releaseWheelFold({ cancel: true });

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      pageFlip.turnToPage(spreadIndexToPageIndex(index));
      syncSpreadFromFlip(spreadIndexToPageIndex(index));
    },
    [animating, releaseWheelFold, getPageFlip, syncSpreadFromFlip],
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

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;
      if ((event.target as Element | null)?.closest?.("[data-horizon-preview]")) {
        return;
      }
      event.preventDefault();

      const now = Date.now();
      const gesture = wheelGestureRef.current;

      if (now - gesture.lastEventAt > WHEEL_GESTURE_GAP_MS) {
        if (now >= gesture.nextTurnAllowedAt) {
          gesture.hasTurnedPage = false;
        }
      }
      gesture.lastEventAt = now;

      if (gesture.hasTurnedPage || now < gesture.nextTurnAllowedAt) {
        return;
      }

      const direction: TurnDirection = event.deltaY > 0 ? "forward" : "back";
      applyWheelFoldDelta(direction, event.deltaY);
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      releaseWheelFold({ cancel: true });
      document.body.classList.remove("overflow-y-hidden");
      document.documentElement.classList.remove("comic-horizon-reading");
    };
  }, [applyWheelFoldDelta, releaseWheelFold]);

  useEffect(() => {
    const area = bookAreaRef.current;
    if (!area || loading) return undefined;

    function getDistElement() {
      return area.querySelector<HTMLElement>(".stf__block");
    }

    function beginCornerDrag(clientX: number, clientY: number, target: EventTarget | null) {
      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl || pageFlip.getState() === "flipping") return;
      if (target && !distEl.contains(target as Node)) return;

      const bounds = pageFlip.getBoundsRect();
      const pos = getDistPos(clientX, clientY, distEl);
      if (!isBookEdgeOrCorner(pos, bounds)) return;

      releaseWheelFold({ cancel: true });
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

      const { pos, startPos } = cornerDragRef.current;
      const bounds = pageFlip.getBoundsRect();
      const direction = getDragDirection(startPos, bounds);
      cornerDragRef.current.active = false;
      releaseActiveFold(pageFlip, pos, direction);
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;
      beginCornerDrag(event.clientX, event.clientY, event.target);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onMouseMove(event: MouseEvent) {
      moveCornerDrag(event.clientX, event.clientY);
    }

    function onMouseUp() {
      endCornerDrag();
    }

    function onTouchStart(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      beginCornerDrag(touch.clientX, touch.clientY, event.target);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      moveCornerDrag(touch.clientX, touch.clientY);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onTouchEnd() {
      endCornerDrag();
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
    };
  }, [getPageFlip, loading, releaseActiveFold, releaseWheelFold]);

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
        wheelGestureRef.current.nextTurnAllowedAt =
          Date.now() + WHEEL_TURN_THROTTLE_MS;
        resetWheelFoldSession();
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
    [getPageFlip, resetWheelFoldSession, syncSpreadFromFlip],
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
